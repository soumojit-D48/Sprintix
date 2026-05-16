'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Circle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { cn } from '@/lib/utils'

const COLUMNS = [
  { key: 'BACKLOG', label: 'Backlog', color: 'bg-gray-500' },
  { key: 'TODO', label: 'Todo', color: 'bg-blue-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { key: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500' },
  { key: 'DONE', label: 'Done', color: 'bg-green-500' },
  { key: 'CANCELLED', label: 'Cancelled', color: 'bg-red-400' },
]

const priorityOrder: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  NO_PRIORITY: 4,
}

export default function BoardPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  const [createOpen, setCreateOpen] = useState(false)
  const [createStatus, setCreateStatus] = useState<string>('TODO')
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)

  const { data: project } = trpc.project.getById.useQuery({ projectId })
  const issueQuery = trpc.issue.list.useQuery({
    projectId,
    limit: 200,
    sortBy: 'order',
    sortOrder: 'asc',
  })
  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  const issues = issueQuery.data?.issues ?? []
  const isLoading = issueQuery.isLoading

  const groupedIssues = COLUMNS.map((col) => ({
    ...col,
    issues: issues
      .filter((i) => i.status === col.key)
      .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)),
  }))

  function handleCreateIssue(status: string) {
    setCreateStatus(status)
    setCreateOpen(true)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">
          {issues.length} issue{issues.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => handleCreateIssue('TODO')}>
          <Plus className="mr-1.5 size-4" />
          Create Issue
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-full gap-4 overflow-x-auto p-6">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-3">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-full gap-4 overflow-x-auto p-6">
          {groupedIssues.map((column) => (
            <div key={column.key} className="flex w-72 shrink-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('size-2 rounded-full', column.color)} />
                  <span className="text-sm font-semibold">{column.label}</span>
                  <span className="text-muted-foreground text-xs">{column.issues.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateIssue(column.key)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto">
                {column.issues.map((issue) => (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => setSlideOverIssueId(issue.id)}
                    className="bg-card hover:bg-accent/50 group flex flex-col gap-2 rounded-lg border p-3 text-left shadow-sm transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <IssueIdentifier identifier={issue.identifier} />
                      {issue.priority !== 'NO_PRIORITY' && (
                        <span
                          className={cn(
                            'shrink-0 text-[10px] font-medium',
                            issue.priority === 'URGENT' && 'text-red-500',
                            issue.priority === 'HIGH' && 'text-orange-500',
                            issue.priority === 'MEDIUM' && 'text-yellow-500',
                            issue.priority === 'LOW' && 'text-blue-500'
                          )}
                        >
                          {issue.priority}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-sm leading-snug">{issue.title}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {issue.labels?.slice(0, 2).map(({ label }) => (
                          <span
                            key={label.id}
                            className="inline-block rounded px-1 text-[10px]"
                            style={{
                              backgroundColor: label.color + '20',
                              color: label.color,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        {issue.dueDate && (
                          <span
                            className={cn(
                              'text-[10px]',
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
                        {issue.assignee && (
                          <Avatar className="size-5">
                            <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                            <AvatarFallback className="text-[9px]">
                              {issue.assignee.name?.charAt(0) ?? 'U'}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {project && workspace && (
        <>
          <IssueCreateModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={projectId}
            workspaceId={project.workspaceId}
            workspaceSlug={workspaceSlug}
            defaultStatus={createStatus}
          />

          <IssueSlideOver
            open={!!slideOverIssueId}
            onOpenChange={(open) => {
              if (!open) setSlideOverIssueId(null)
            }}
            issueId={slideOverIssueId ?? ''}
            workspaceId={project.workspaceId}
            workspaceSlug={workspaceSlug}
          />
        </>
      )}
    </div>
  )
}
