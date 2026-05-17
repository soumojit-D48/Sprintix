'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ListChecks, Circle, Clock, AlertCircle } from 'lucide-react'
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

const priorityColors: Record<string, string> = {
  URGENT: 'text-red-500',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-500',
  NO_PRIORITY: 'text-muted-foreground',
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

  // Single query for all issues assigned to current user — no hooks-in-loop
  const { data: myIssues = [], isLoading } = trpc.issue.listForCurrentUser.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const now = new Date()
  const todayStr = now.toDateString()

  const filteredIssues = myIssues.filter((i) => {
    if (activeTab === 'ALL') return true
    if (activeTab === 'ACTIVE') return !['DONE', 'CANCELLED'].includes(i.status)
    if (activeTab === 'IN_PROGRESS') return i.status === 'IN_PROGRESS'
    if (activeTab === 'TODO') return i.status === 'TODO'
    if (activeTab === 'OVERDUE') return !!i.dueDate && new Date(i.dueDate) < now
    if (activeTab === 'DUE_TODAY')
      return !!i.dueDate && new Date(i.dueDate).toDateString() === todayStr
    if (activeTab === 'NO_DUE_DATE') return !i.dueDate
    return true
  })

  // Group by project
  const groupedByProject = filteredIssues.reduce<
    Record<
      string,
      { projectId: string; projectName: string; projectColor: string; issues: typeof filteredIssues }
    >
  >((acc, issue) => {
    const p = issue.project
    if (!p) return acc
    if (!acc[p.id]) {
      acc[p.id] = { projectId: p.id, projectName: p.name, projectColor: p.color ?? '#3B82F6', issues: [] }
    }
    acc[p.id]!.issues.push(issue)
    return acc
  }, {})

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">My Issues</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {filteredIssues.length} issue{filteredIssues.length !== 1 ? 's' : ''} assigned to you
          </p>
        </div>

        {/* Filter tabs */}
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

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredIssues.length === 0 ? (
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
            {Object.values(groupedByProject).map(({ projectId, projectName, projectColor, issues }) => (
              <div key={projectId}>
                {/* Project group header */}
                <div className="mb-3 flex items-center gap-2">
                  <div
                    className="size-3 rounded-full"
                    style={{ backgroundColor: projectColor || '#3B82F6' }}
                  />
                  <Link
                    href={`/${workspaceSlug}/projects/${projectId}/board`}
                    className="text-sm font-semibold hover:underline"
                  >
                    {projectName}
                  </Link>
                  <span className="text-muted-foreground text-xs">{issues.length}</span>
                </div>

                {/* Issues in this project */}
                <div className="space-y-1">
                  {issues.map((issue) => {
                    const isOverdue = !!issue.dueDate && new Date(issue.dueDate) < now
                    const isDueToday =
                      !!issue.dueDate && new Date(issue.dueDate).toDateString() === todayStr

                    return (
                      <Link
                        key={issue.id}
                        href={`/${workspaceSlug}/issues/${issue.id}`}
                        className="hover:bg-muted/50 group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
                      >
                        <Circle
                          className={cn(
                            'size-3 shrink-0 fill-current',
                            statusColors[issue.status] ?? 'text-gray-400'
                          )}
                        />
                        <IssueIdentifier identifier={issue.identifier} />
                        <span className="flex-1 truncate text-sm">{issue.title}</span>

                        {/* Priority badge */}
                        {issue.priority !== 'NO_PRIORITY' && (
                          <span
                            className={cn(
                              'hidden shrink-0 text-xs font-medium sm:inline',
                              priorityColors[issue.priority] ?? ''
                            )}
                          >
                            {issue.priority.charAt(0) + issue.priority.slice(1).toLowerCase()}
                          </span>
                        )}

                        {/* Due date */}
                        {issue.dueDate && (
                          <span
                            className={cn(
                              'flex shrink-0 items-center gap-1 text-xs',
                              isOverdue
                                ? 'text-destructive font-medium'
                                : isDueToday
                                  ? 'text-orange-500 font-medium'
                                  : 'text-muted-foreground'
                            )}
                          >
                            {isOverdue ? (
                              <AlertCircle className="size-3" />
                            ) : isDueToday ? (
                              <Clock className="size-3" />
                            ) : null}
                            {new Date(issue.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}

                        {/* Labels */}
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

                        {/* Assignee avatar */}
                        {issue.assignee && (
                          <Avatar className="size-5 shrink-0">
                            <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                            <AvatarFallback className="text-[9px]">
                              {issue.assignee.name?.charAt(0) ?? 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
