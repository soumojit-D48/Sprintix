'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ListChecks, Circle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { cn } from '@/lib/utils'

const statusColors: Record<string, string> = {
  BACKLOG: 'text-gray-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-yellow-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-red-400',
}

const priorityOrder: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NO_PRIORITY: 4,
}

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Todo', value: 'TODO' },
  { label: 'Overdue', value: 'OVERDUE' },
  { label: 'Due Today', value: 'DUE_TODAY' },
  { label: 'No Due Date', value: 'NO_DUE_DATE' },
]

export default function MyIssuesPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const [activeTab, setActiveTab] = useState('ALL')

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const { data: user } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const { data: currentMember } = trpc.member.getCurrentMember.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )
  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const projectIds = projects?.map((p) => p.id) ?? []

  const allIssues = projectIds.map((projectId) =>
    trpc.issue.list.useQuery(
      { projectId, limit: 200, sortBy: 'priority', sortOrder: 'asc' },
      { enabled: projectIds.length > 0 }
    )
  )

  const isLoading = allIssues.some((q) => q.isLoading)

  const myIssues = allIssues
    .flatMap((q) => q.data?.issues ?? [])
    .filter((i) => {
      if (!currentMember) return false
      return i.assignee?.id === currentMember.userId
    })
    .filter((i) => {
      if (activeTab === 'ALL') return true
      if (activeTab === 'ACTIVE') return !['DONE', 'CANCELLED'].includes(i.status)
      if (activeTab === 'OVERDUE') return i.dueDate && new Date(i.dueDate) < new Date()
      if (activeTab === 'DUE_TODAY') {
        const today = new Date()
        return i.dueDate && new Date(i.dueDate).toDateString() === today.toDateString()
      }
      if (activeTab === 'NO_DUE_DATE') return !i.dueDate
      return i.status === activeTab
    })
    .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99))

  const groupedByProject = projects?.reduce(
    (acc, project) => {
      const projectIssues = myIssues.filter((i) => i.projectId === project.id)
      if (projectIssues.length > 0) {
        acc[project.id] = { project, issues: projectIssues }
      }
      return acc
    },
    {} as Record<string, { project: (typeof projects)[0]; issues: typeof myIssues }>
  )

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Issues</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {myIssues.length} issue{myIssues.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-1">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : myIssues.length === 0 ? (
          <div className="border-border flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
            <ListChecks className="text-muted-foreground mb-4 size-12" />
            <h3 className="mb-1 text-lg font-semibold">No issues found</h3>
            <p className="text-muted-foreground text-sm">
              {activeTab === 'ALL'
                ? 'No issues are assigned to you yet.'
                : 'No issues match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedByProject &&
              Object.values(groupedByProject).map(({ project, issues }) => (
                <div key={project.id}>
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className="size-3 rounded-full"
                      style={{ backgroundColor: project.color || '#3B82F6' }}
                    />
                    <Link
                      href={`/${workspaceSlug}/projects/${project.id}/board`}
                      className="text-sm font-semibold hover:underline"
                    >
                      {project.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">{issues.length}</span>
                  </div>

                  <div className="space-y-1">
                    {issues.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/${workspaceSlug}/issues/${issue.id}`}
                        className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                      >
                        <Circle
                          className={cn(
                            'size-3 shrink-0 fill-current',
                            statusColors[issue.status] ?? 'text-gray-400'
                          )}
                        />
                        <IssueIdentifier identifier={issue.identifier} />
                        <span className="flex-1 truncate text-sm">{issue.title}</span>
                        {issue.dueDate && (
                          <span
                            className={cn(
                              'shrink-0 text-xs',
                              new Date(issue.dueDate) < new Date()
                                ? 'text-destructive font-medium'
                                : 'text-muted-foreground'
                            )}
                          >
                            {new Date(issue.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                        {issue.labels && issue.labels.length > 0 && (
                          <div className="hidden gap-1 md:flex">
                            {issue.labels.slice(0, 2).map(({ label }) => (
                              <Badge
                                key={label.id}
                                variant="outline"
                                className="text-[10px]"
                                style={{
                                  backgroundColor: label.color + '20',
                                  color: label.color,
                                  borderColor: label.color + '40',
                                }}
                              >
                                {label.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {issue.assignee && (
                          <Avatar className="size-5 shrink-0">
                            <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                            <AvatarFallback className="text-[9px]">
                              {issue.assignee.name?.charAt(0) ?? 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </main>
  )
}
