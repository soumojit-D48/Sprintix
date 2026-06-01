export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FolderKanban,
  BarChart3,
  ChevronRight,
  LayoutDashboard,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

async function getWorkspaceData(workspaceSlug: string, userId: string) {
  const allWorkspaces = await prisma.workspace.findMany({
    where: {
      OR: [{ slug: workspaceSlug }, { previousSlugs: { has: workspaceSlug } }],
    },
    include: {
      members: {
        include: {
          user: true,
        },
      },
      projects: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  const workspace = allWorkspaces.find((w) => w.slug === workspaceSlug)
  const previousSlugMatch = allWorkspaces.find(
    (w) => w.slug !== workspaceSlug && w.previousSlugs.includes(workspaceSlug)
  )

  if (previousSlugMatch) {
    redirect(`/${previousSlugMatch.slug}`)
  }

  if (!workspace) {
    notFound()
  }

  return workspace
}

export default async function WorkspaceDashboardPage({ params }: Props) {
  const { workspaceSlug } = await params
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      workspaceMembers: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const workspace = await getWorkspaceData(workspaceSlug, user.id)

  const workspaces = user.workspaceMembers.map((wm) => ({
    id: wm.workspace.id,
    name: wm.workspace.name,
    slug: wm.workspace.slug,
  }))

  const projects = workspace.projects.map((p) => ({
    id: p.id,
    name: p.name,
    identifier: p.identifier,
    color: p.color ?? '#3B82F6',
  }))

  const { weekStart, weekEnd } = getWeekRange()
  const lastWeek = getLastWeekRange()

  const [openIssueCount, thisWeekCompleted, lastWeekCompleted, overdueCount, memberCount, recentActivity] =
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
      prisma.workspaceMember.count({
        where: { workspaceId: workspace.id },
      }),
      prisma.activityLog.findMany({
        where: {
          entityType: 'issue',
          issue: {
            project: { workspaceId: workspace.id },
          },
        },
        include: {
          user: true,
          issue: {
            select: {
              identifier: true,
              title: true,
              projectId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  const trend =
    lastWeekCompleted > 0
      ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
      : thisWeekCompleted > 0
        ? 100
        : 0

  const isTrendPositive = trend >= 0

  const overdueIssues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: workspace.id },
      deletedAt: null,
      status: { notIn: ['DONE', 'CANCELLED'] },
      dueDate: { not: null, lt: new Date() },
    },
    include: {
      assignee: {
        select: { id: true, name: true, avatarUrl: true },
      },
      project: {
        select: { id: true, name: true, identifier: true, color: true },
      },
    },
    orderBy: { dueDate: 'asc' },
    take: 10,
  })

  const workloadMembers = workspace.members.slice(0, 10)

  return (
    <main className="bg-background h-full overflow-auto">
      <div className="container mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Here's what&apos;s happening in{' '}
              <span className="text-foreground font-medium">{workspace.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${workspaceSlug}/analytics`}>
                <BarChart3 className="mr-1.5 size-3.5" />
                Analytics
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${workspaceSlug}/settings`}>Workspace Settings</Link>
            </Button>
          </div>
        </div>

        {/* Row 1: Stat Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Open Issues
              </CardTitle>
              <BarChart3 className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openIssueCount}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Completed This Week
              </CardTitle>
              <CheckCircle2 className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{thisWeekCompleted}</div>
              <div className="mt-1 flex items-center gap-1">
                {isTrendPositive ? (
                  <TrendingUp className="size-3 text-green-500" />
                ) : (
                  <TrendingDown className="size-3 text-red-500" />
                )}
                <span
                  className={cn(
                    'text-xs font-medium',
                    isTrendPositive ? 'text-green-500' : 'text-red-500'
                  )}
                >
                  {trend > 0 ? '+' : ''}
                  {trend}%
                </span>
                <span className="text-muted-foreground text-xs">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Overdue
              </CardTitle>
              <AlertCircle className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueCount}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Team Workload (simplified server-side version) */}
        {workloadMembers.length > 0 && (
          <Card className="border-border/50 bg-card/50 mb-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">Team Workload</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${workspaceSlug}/analytics`}>
                  <ArrowUpRight className="mr-1 size-3.5" />
                  Full report
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {workloadMembers.map((member) => {
                  const initials = (member.user.name ?? 'U').charAt(0).toUpperCase()
                  return (
                    <div
                      key={member.id}
                      className="border-border/50 bg-background/30 flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Avatar className="size-8 shrink-0">
                        <AvatarImage src={member.user.avatarUrl ?? ''} alt={member.user.name ?? ''} />
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.user.name}</p>
                        <p className="text-muted-foreground text-xs">{member.role}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Row 3: Recent Activity & Overdue Issues */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Activity */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="size-4" />
                  Recent Activity
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  <BarChart3 className="mx-auto mb-2 size-8 opacity-40" />
                  No activity yet in this workspace.
                </div>
              ) : (
                <div className="space-y-1">
                  {recentActivity.map((log: any) => {
                    const href = log.issue?.projectId
                      ? `/${workspaceSlug}/issues/${log.entityId}`
                      : null
                    const content = (
                      <div className="hover:bg-muted/30 flex items-start gap-3 rounded-lg p-2 transition-colors">
                        <Avatar className="size-7 shrink-0">
                          <AvatarImage src={log.user.avatarUrl ?? ''} alt={log.user.name ?? ''} />
                          <AvatarFallback>
                            {(log.user.name ?? 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-muted-foreground text-sm">
                            <span className="text-foreground font-medium">{log.user.name}</span>{' '}
                            {log.action.toLowerCase()}
                            {log.issue && (
                              <>
                                {' '}
                                <span className="text-primary font-mono text-xs">
                                  {log.issue.identifier}
                                </span>{' '}
                                <span className="text-foreground">{log.issue.title}</span>
                              </>
                            )}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {new Date(log.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        {href && <ChevronRight className="text-muted-foreground mt-1 size-3.5 shrink-0" />}
                      </div>
                    )
                    return href ? (
                      <Link key={log.id} href={href} className="block">
                        {content}
                      </Link>
                    ) : (
                      <div key={log.id}>{content}</div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overdue Issues */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-base font-semibold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 text-red-500" />
                  Overdue Issues
                  {overdueIssues.length > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {overdueIssues.length}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {overdueIssues.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center py-6 text-sm">
                  <CheckCircle2 className="mb-2 size-8 opacity-40" />
                  No overdue issues. Great job!
                </div>
              ) : (
                <div className="space-y-2">
                  {overdueIssues.map((issue) => (
                    <Link
                      key={issue.id}
                      href={`/${workspaceSlug}/issues/${issue.id}`}
                      className="border-border/50 bg-background/30 hover:border-border hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <div
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                        style={{ backgroundColor: issue.project.color ?? '#3B82F6' }}
                      >
                        {issue.project.identifier.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {issue.identifier} — {issue.title}
                          </span>
                          <Badge variant="destructive" className="shrink-0 text-[10px]">
                            {Math.floor(
                              (Date.now() - new Date(issue.dueDate!).getTime()) /
                                (1000 * 60 * 60 * 24)
                            )}
                            d overdue
                          </Badge>
                        </div>
                        <p className="text-muted-foreground text-xs">{issue.project.name}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Projects */}
        {projects.length > 0 && (
          <div>
            <h2 className="mb-4 text-lg font-semibold">Quick Access</h2>
            <div className="flex flex-wrap gap-3">
              {projects.slice(0, 6).map((project) => (
                <Link
                  key={project.id}
                  href={`/${workspaceSlug}/projects/${project.id}`}
                  className="border-border/50 bg-card/50 hover:border-border hover:bg-muted/50 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors"
                >
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium">{project.name}</span>
                  <span className="text-muted-foreground text-xs">{project.identifier}</span>
                </Link>
              ))}
              {projects.length > 6 && (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/${workspaceSlug}/projects`}>See all ({projects.length})</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
