import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { WorkloadChart } from '@/components/analytics/WorkloadChart'
import { OverdueIssuesList } from '@/components/analytics/OverdueIssuesList'
import { IssuesByStatusChart } from '@/components/analytics/IssuesByStatusChart'
import { IssuesByPriorityChart } from '@/components/analytics/IssuesByPriorityChart'
import { StatCard } from '@/components/analytics/StatCard'
import { BarChart3, ArrowLeft, TrendingUp } from 'lucide-react'
import type { IssueStatus, Priority } from '@prisma/client'

type Props = {
  params: Promise<{ workspaceSlug: string }>
}

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  return { weekStart: monday, weekEnd: nextMonday }
}

function getLastWeekRange() {
  const { weekStart } = getWeekRange()
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  return { weekStart: lastWeekStart, weekEnd: weekStart }
}

const STATUS_ORDER: IssueStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
const PRIORITY_ORDER: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']

async function getWorkspaceBySlug(slug: string) {
  const allWorkspaces = await prisma.workspace.findMany({
    where: { OR: [{ slug }, { previousSlugs: { has: slug } }] },
    select: { id: true, name: true, slug: true, previousSlugs: true },
  })
  const match = allWorkspaces.find((w) => w.slug === slug)
  const prevMatch = allWorkspaces.find((w) => w.slug !== slug && w.previousSlugs.includes(slug))
  if (prevMatch) redirect(`/${prevMatch.slug}/analytics`)
  if (!match) notFound()
  return match
}

export default async function WorkspaceAnalyticsPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })
  if (!user) notFound()

  const workspace = await getWorkspaceBySlug(workspaceSlug)

  const membership = await prisma.workspaceMember.findFirst({
    where: { workspaceId: workspace.id, userId: user.id },
  })
  if (!membership) redirect(`/${workspaceSlug}`)

  const { weekStart, weekEnd } = getWeekRange()
  const lastWeek = getLastWeekRange()

  const [openIssueCount, thisWeekCompleted, lastWeekCompleted, overdueCount, memberCount] =
    await Promise.all([
      prisma.issue.count({
        where: {
          project: { workspaceId: workspace.id },
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
        },
      }),
      prisma.issue.count({
        where: {
          project: { workspaceId: workspace.id },
          status: 'DONE',
          updatedAt: { gte: weekStart, lt: weekEnd },
          deletedAt: null,
        },
      }),
      prisma.issue.count({
        where: {
          project: { workspaceId: workspace.id },
          status: 'DONE',
          updatedAt: { gte: lastWeek.weekStart, lt: lastWeek.weekEnd },
          deletedAt: null,
        },
      }),
      prisma.issue.count({
        where: {
          project: { workspaceId: workspace.id },
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { not: null, lt: new Date() },
        },
      }),
      prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
    ])

  const trend =
    lastWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : thisWeekCompleted > 0
        ? 100
        : 0

  const allMembers = await prisma.workspaceMember.findMany({
    where: { workspaceId: workspace.id },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  const workloadData = await Promise.all(
    allMembers.map(async (m) => {
      const [openCount, inProgressCount, memberOverdueCount] = await Promise.all([
        prisma.issue.count({
          where: {
            assigneeId: m.user.id,
            project: { workspaceId: workspace.id },
            deletedAt: null,
            status: { notIn: ['DONE', 'CANCELLED'] },
          },
        }),
        prisma.issue.count({
          where: {
            assigneeId: m.user.id,
            project: { workspaceId: workspace.id },
            deletedAt: null,
            status: { in: ['IN_PROGRESS', 'IN_REVIEW'] },
          },
        }),
        prisma.issue.count({
          where: {
            assigneeId: m.user.id,
            project: { workspaceId: workspace.id },
            deletedAt: null,
            status: { notIn: ['DONE', 'CANCELLED'] },
            dueDate: { not: null, lt: new Date() },
          },
        }),
      ])
      return {
        userId: m.user.id,
        name: m.user.name,
        avatarUrl: m.user.avatarUrl,
        openCount,
        inProgressCount,
        overdueCount: memberOverdueCount,
      }
    })
  )
  workloadData.sort((a, b) => b.openCount - a.openCount)

  const overdueIssues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: workspace.id },
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELLED'] },
      dueDate: { not: null, lt: new Date() },
    },
    include: {
      assignee: { select: { id: true, name: true, avatarUrl: true } },
      project: { select: { id: true, name: true, identifier: true, color: true } },
    },
    orderBy: { dueDate: 'asc' },
    take: 20,
  })

  const overdueData = overdueIssues.map((issue) => ({
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    status: issue.status,
    priority: issue.priority,
    dueDate: issue.dueDate!,
    daysOverdue: Math.floor(
      (Date.now() - issue.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
    ),
    assignee: issue.assignee,
    project: {
      id: issue.project.id,
      name: issue.project.name,
      identifier: issue.project.identifier,
      color: issue.project.color,
    },
  }))

  const projectSummaries = await Promise.all(
    (
      await prisma.project.findMany({
        where: { workspaceId: workspace.id, status: { not: 'ARCHIVED' } },
        select: { id: true, name: true, identifier: true, color: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      })
    ).map(async (project) => {
      const [statusData, priorityData] = await Promise.all([
        prisma.issue.groupBy({
          by: ['status'],
          where: { projectId: project.id, deletedAt: null },
          _count: true,
        }),
        prisma.issue.groupBy({
          by: ['priority'],
          where: { projectId: project.id, deletedAt: null },
          _count: true,
        }),
      ])
      const statusMap = Object.fromEntries(statusData.map((s) => [s.status, s._count]))
      const priorityMap = Object.fromEntries(priorityData.map((p) => [p.priority, p._count]))
      return {
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        color: project.color,
        issuesByStatus: STATUS_ORDER.map((status) => ({
          status,
          count: (statusMap[status] as number) ?? 0,
        })),
        issuesByPriority: PRIORITY_ORDER.map((priority) => ({
          priority,
          count: (priorityMap[priority] as number) ?? 0,
        })),
      }
    })
  )

  return (
    <main className="bg-background h-full overflow-auto">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link href={`/${workspaceSlug}`}>
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <BarChart3 className="text-muted-foreground size-5" />
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              Workspace-wide metrics and trends for {workspace.name}
            </p>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Open Issues" value={openIssueCount} icon={<BarChart3 className="size-4" />} />
          <StatCard
            title="Completed This Week"
            value={thisWeekCompleted}
            icon={<TrendingUp className="size-4" />}
            trend={trend}
            trendLabel="vs last week"
          />
          <StatCard title="Overdue" value={overdueCount} icon={<BarChart3 className="size-4" />} />
          <StatCard title="Team Members" value={memberCount} icon={<BarChart3 className="size-4" />} />
        </div>

        {/* Team Workload */}
        <div className="mb-8">
          <WorkloadChart data={workloadData} />
        </div>

        {/* Per-Project Summaries */}
        <div className="mb-8 space-y-6">
          <h2 className="text-lg font-semibold">Project Breakdown</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {projectSummaries.map((project) => (
              <div key={project.id} className="space-y-4">
                <Link
                  href={`/${workspaceSlug}/projects/${project.id}`}
                  className="flex items-center gap-2 text-sm font-medium hover:underline"
                >
                  <div
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: project.color ?? '#3B82F6' }}
                  />
                  {project.name}
                  <span className="text-muted-foreground text-xs">{project.identifier}</span>
                </Link>
                <IssuesByStatusChart data={project.issuesByStatus} />
                <IssuesByPriorityChart data={project.issuesByPriority} />
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Issues */}
        <OverdueIssuesList data={overdueData} workspaceSlug={workspaceSlug} />
      </div>
    </main>
  )
}
