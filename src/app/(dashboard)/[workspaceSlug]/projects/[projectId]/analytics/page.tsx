import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { IssuesByStatusChart } from '@/components/analytics/IssuesByStatusChart'
import { IssuesByPriorityChart } from '@/components/analytics/IssuesByPriorityChart'
import { VelocityChart } from '@/components/analytics/VelocityChart'
import { BurndownChart } from '@/components/analytics/BurndownChart'
import { BarChart3 } from 'lucide-react'
import type { IssueStatus, Priority, SprintStatus } from '@prisma/client'

type Props = {
  params: Promise<{ workspaceSlug: string; projectId: string }>
}

const STATUS_ORDER: IssueStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
const PRIORITY_ORDER: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']

export default async function ProjectAnalyticsPage({ params }: Props) {
  const { workspaceSlug, projectId } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })
  if (!user) redirect('/sign-in')

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug: workspaceSlug } },
    select: { id: true },
  })
  if (!membership) redirect(`/${workspaceSlug}`)

  const project = await prisma.project.findFirst({
    where: { id: projectId, workspace: { slug: workspaceSlug } },
    select: { id: true, name: true, identifier: true, color: true },
  })
  if (!project) notFound()

  const [issuesByStatus, issuesByPriority, activeSprint, completedSprints] = await Promise.all([
    prisma.issue.groupBy({
      by: ['status'],
      where: { projectId, deletedAt: null },
      _count: true,
    }),
    prisma.issue.groupBy({
      by: ['priority'],
      where: { projectId, deletedAt: null },
      _count: true,
    }),
    prisma.sprint.findFirst({
      where: { projectId, status: 'ACTIVE' },
      include: {
        issues: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
    }),
    prisma.sprint.findMany({
      where: { projectId, status: 'COMPLETED' },
      include: {
        issues: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: { endDate: 'desc' },
      take: 6,
    }),
  ])

  const statusMap = Object.fromEntries(issuesByStatus.map((s) => [s.status, s._count]))
  const priorityMap = Object.fromEntries(issuesByPriority.map((p) => [p.priority, p._count]))

  const statusChartData = STATUS_ORDER.map((status) => ({
    status,
    count: (statusMap[status] as number) ?? 0,
  }))

  const priorityChartData = PRIORITY_ORDER.map((priority) => ({
    priority,
    count: (priorityMap[priority] as number) ?? 0,
  }))

  const velocityData = completedSprints
    .map((s) => {
      const total = s.issues.length
      const done = s.issues.filter((i) => i.status === 'DONE').length
      const cancelled = s.issues.filter((i) => i.status === 'CANCELLED').length
      const active = total - cancelled
      return {
        sprintId: s.id,
        sprintName: s.name,
        startDate: s.startDate,
        endDate: s.endDate,
        totalIssues: total,
        completedIssues: done,
        cancelledIssues: cancelled,
        completionRate: active > 0 ? Math.round((done / active) * 100) : 0,
      }
    })
    .reverse()

  const averageVelocity =
    velocityData.length > 0
      ? Math.round(velocityData.reduce((sum, s) => sum + s.completedIssues, 0) / velocityData.length)
      : 0

  let burndownData: { sprintId: string; sprintName: string; startDate: Date; endDate: Date; totalIssues: number; doneIssues: number; cancelledIssues: number; completionRate: number; burndownData: { date: string; ideal: number; actual: number }[] } | null = null

  if (activeSprint) {
    const totalIssues = activeSprint.issues.length
    const doneIssues = activeSprint.issues.filter((i) => i.status === 'DONE').length
    const cancelledIssues = activeSprint.issues.filter((i) => i.status === 'CANCELLED').length
    const activeIssues = totalIssues - cancelledIssues

    const sprintDays =
      Math.ceil(
        (activeSprint.endDate.getTime() - activeSprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1

    const statusChanges = await prisma.activityLog.findMany({
      where: {
        entityType: 'issue',
        action: 'status_changed',
        issue: { sprintId: activeSprint.id },
        createdAt: { gte: activeSprint.startDate, lte: activeSprint.endDate },
      },
      orderBy: { createdAt: 'asc' },
    })

    const burndownPoints: { date: string; ideal: number; actual: number }[] = []
    let remainingIssues = activeIssues

    for (let i = 0; i < sprintDays; i++) {
      const date = new Date(activeSprint.startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]!

      const completedOnDay = statusChanges.filter(
        (log) =>
          log.createdAt.toISOString().split('T')[0] === dateStr &&
          (log.metadata as { to?: string })?.to === 'DONE'
      ).length

      remainingIssues -= completedOnDay
      remainingIssues = Math.max(0, remainingIssues)

      const daysLeft = sprintDays - i - 1
      const idealRemaining = daysLeft > 0 ? (activeIssues * daysLeft) / (sprintDays - 1) : 0

      burndownPoints.push({
        date: dateStr,
        ideal: Math.round(idealRemaining),
        actual: remainingIssues,
      })
    }

    burndownData = {
      sprintId: activeSprint.id,
      sprintName: activeSprint.name,
      startDate: activeSprint.startDate,
      endDate: activeSprint.endDate,
      totalIssues,
      doneIssues,
      cancelledIssues,
      completionRate: activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0,
      burndownData: burndownPoints,
    }
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-muted-foreground size-5" />
          <h1 className="text-2xl font-bold tracking-tight">Project Analytics</h1>
          <div
            className="ml-2 size-2.5 rounded-full"
            style={{ backgroundColor: project.color ?? '#3B82F6' }}
          />
          <span className="text-muted-foreground text-sm">{project.name}</span>
          <span className="text-muted-foreground font-mono text-xs">{project.identifier}</span>
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          Charts and metrics for this project
        </p>
      </div>

      {/* Row 1: Burndown + Status (2 columns) */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {burndownData ? (
          <BurndownChart
            data={burndownData.burndownData}
            title="Active Sprint Burndown"
            description={`${burndownData.sprintName} · ${burndownData.completionRate}% complete`}
          />
        ) : (
          <div className="border-border/50 bg-card/50 flex h-80 items-center justify-center rounded-lg border text-sm text-muted-foreground">
            No active sprint to show burndown.
          </div>
        )}
        <IssuesByStatusChart data={statusChartData} />
      </div>

      {/* Row 2: Priority + Velocity (2 columns) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <IssuesByPriorityChart data={priorityChartData} />
        <VelocityChart data={velocityData} averageVelocity={averageVelocity} />
      </div>
    </div>
  )
}
