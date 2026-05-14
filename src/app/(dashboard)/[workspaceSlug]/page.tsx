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
} from 'lucide-react'

type Props = {
  params: Promise<{ workspaceSlug: string }>
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

  // Fetch assigned issues
  const assignedIssues = await prisma.issue.findMany({
    where: {
      project: { workspaceId: workspace.id },
      assigneeId: user.id,
      deletedAt: null,
    },
    include: {
      project: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 10,
  })

  // Fetch recent activity
  const recentActivity = await prisma.activityLog.findMany({
    where: {
      entityType: 'ISSUE',
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
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
  })

  // Count issues grouped by status
  const issueCounts = await prisma.issue.groupBy({
    by: ['status'],
    where: {
      project: { workspaceId: workspace.id },
      deletedAt: null,
    },
    _count: true,
  })

  const countsMap: Record<string, number> = {}
  issueCounts.forEach((item: any) => {
    countsMap[item.status] = item._count
  })

  const totalIssues =
    (countsMap.BACKLOG ?? 0) +
    (countsMap.TODO ?? 0) +
    (countsMap.IN_PROGRESS ?? 0) +
    (countsMap.IN_REVIEW ?? 0) +
    (countsMap.DONE ?? 0) +
    (countsMap.CANCELLED ?? 0)

  return (
    <main className="bg-background flex-1 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        {/* Greeting */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, {user.name?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Here's an overview of your workspace{' '}
              <span className="text-foreground font-medium">{workspace.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/${workspaceSlug}/settings`}>Workspace Settings</Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                Total Issues
              </CardTitle>
              <BarChart3 className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalIssues}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                My Assigned
              </CardTitle>
              <Users className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignedIssues.length}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                In Progress
              </CardTitle>
              <Clock className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countsMap.IN_PROGRESS ?? 0}</div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">Done</CardTitle>
              <CheckCircle2 className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{countsMap.DONE ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Issues & Activity Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Issues */}
          <Card className="border-border/50 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4" />
                  My Assigned Issues
                  <Badge variant="secondary" className="ml-auto">
                    {assignedIssues.length}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignedIssues.length === 0 ? (
                <div className="text-muted-foreground py-6 text-center text-sm">
                  <FolderKanban className="mx-auto mb-2 size-8 opacity-40" />
                  No issues assigned to you yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedIssues.map((issue: any) => (
                    <Link
                      key={issue.id}
                      href={`/${workspaceSlug}/projects/${issue.project.id}/issues/${issue.id}`}
                      className="border-border/50 bg-background/30 hover:border-border hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
                    >
                      <Badge
                        variant={
                          issue.status === 'IN_PROGRESS'
                            ? 'default'
                            : issue.status === 'DONE'
                              ? 'secondary'
                              : 'outline'
                        }
                        className="text-xs"
                      >
                        {issue.status.replace('_', ' ')}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {issue.identifier} — {issue.title}
                        </p>
                        <p className="text-muted-foreground text-xs">{issue.project.name}</p>
                      </div>
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                <div className="space-y-4">
                  {recentActivity.map((log: any) => (
                    <div
                      key={log.id}
                      className="hover:bg-muted/30 flex items-start gap-3 rounded-lg p-2 transition-colors"
                    >
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
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Projects */}
        {projects.length > 0 && (
          <div className="mt-8">
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
