'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { SprintProgress } from './SprintProgress'
import { SprintBurndown } from './SprintBurndown'
import { SprintCloseModal } from './SprintCloseModal'
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

interface SprintBoardProps {
  sprintId: string
  projectId: string
  workspaceSlug: string
  workspaceId: string
}

export function SprintBoard({
  sprintId,
  projectId,
  workspaceSlug,
  workspaceId,
}: SprintBoardProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [closeOpen, setCloseOpen] = useState(false)
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)

  const { data: sprint, isLoading } = trpc.sprint.getById.useQuery({ sprintId })
  const { data: stats } = trpc.sprint.getStats.useQuery({ sprintId })

  const utils = trpc.useUtils()
  const addIssue = trpc.sprint.addIssue.useMutation({
    onSuccess: () => {
      utils.sprint.getById.invalidate({ sprintId })
      utils.sprint.list.invalidate({ projectId })
    },
  })

  const removeIssue = trpc.sprint.removeIssue.useMutation({
    onSuccess: () => {
      utils.sprint.getById.invalidate({ sprintId })
      utils.sprint.list.invalidate({ projectId })
    },
  })

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-6 w-full" />
        <div className="flex gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-3">
              <Skeleton className="h-8 w-full" />
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center">
        Sprint not found.
      </div>
    )
  }

  const issues = sprint.issues ?? []
  const completedIssues = issues.filter((i) => i.status === 'DONE').length

  const groupedIssues = COLUMNS.map((col) => ({
    ...col,
    issues: issues
      .filter((i) => i.status === col.key)
      .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)),
  }))

  return (
    <div className="flex h-full flex-col">
      {/* Sprint header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{sprint.name}</h2>
              <Badge
                variant="outline"
                className={cn(
                  'text-xs',
                  sprint.status === 'ACTIVE'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : sprint.status === 'PLANNED'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-gray-50 text-gray-600'
                )}
              >
                {sprint.status === 'ACTIVE'
                  ? 'Active'
                  : sprint.status === 'PLANNED'
                    ? 'Planned'
                    : 'Completed'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {new Date(sprint.startDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}{' '}
              –{' '}
              {new Date(sprint.endDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {sprint.status === 'ACTIVE' && (
              <Button size="sm" variant="outline" onClick={() => setCloseOpen(true)}>
                Close Sprint
              </Button>
            )}
            {(sprint.status === 'PLANNED' || sprint.status === 'ACTIVE') && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1.5 size-4" />
                Create Issue
              </Button>
            )}
          </div>
        </div>

        <SprintProgress
          completedIssues={completedIssues}
          totalIssues={issues.length}
          className="mt-4"
        />
      </div>

      <div className="flex flex-1 gap-6 overflow-auto p-6">
        {/* Kanban columns */}
        <div className="flex flex-1 gap-4">
          {groupedIssues.map((col) => (
            <div key={col.key} className="flex w-72 shrink-0 flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className={cn('size-2.5 rounded-full', col.color)} />
                <span className="text-sm font-medium">{col.label}</span>
                <span className="text-muted-foreground text-xs">{col.issues.length}</span>
              </div>

              <div className="flex flex-col gap-2">
                {col.issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="hover:bg-muted/50 cursor-pointer rounded-lg border bg-white p-3 transition-colors"
                    onClick={() => setSlideOverIssueId(issue.id)}
                  >
                    <div className="flex items-center gap-2">
                      <IssueIdentifier identifier={issue.identifier} />
                      {issue.assignee && (
                        <Avatar className="ml-auto size-5">
                          <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                          <AvatarFallback className="text-[9px]">
                            {issue.assignee.name?.charAt(0) ?? 'U'}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm">{issue.title}</p>
                  </div>
                ))}
                {col.issues.length === 0 && (
                  <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
                    No issues
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Burndown sidebar */}
        {stats && stats.burndownData.length > 0 && (
          <div className="w-80 shrink-0">
            <SprintBurndown data={stats.burndownData} />
          </div>
        )}
      </div>

      {/* Issue list section (compact) */}
      {issues.length > 0 && (
        <div className="border-t px-6 py-4">
          <h3 className="mb-3 text-sm font-medium">All sprint issues</h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors"
                onClick={() => setSlideOverIssueId(issue.id)}
              >
                <div
                  className={cn(
                    'size-2 shrink-0 rounded-full',
                    issue.status === 'DONE'
                      ? 'bg-green-500'
                      : issue.status === 'IN_PROGRESS'
                        ? 'bg-yellow-500'
                        : issue.status === 'IN_REVIEW'
                          ? 'bg-purple-500'
                          : issue.status === 'TODO'
                            ? 'bg-blue-500'
                            : issue.status === 'CANCELLED'
                              ? 'bg-red-400'
                              : 'bg-gray-500'
                  )}
                />
                <span className="text-muted-foreground font-mono">
                  {issue.identifier}
                </span>
                <span className="flex-1 truncate">{issue.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <IssueCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        sprintId={sprintId}
        onCreated={() => {
          utils.sprint.getById.invalidate({ sprintId })
          utils.sprint.list.invalidate({ projectId })
        }}
      />

      <SprintCloseModal
        open={closeOpen}
        onOpenChange={setCloseOpen}
        sprintId={sprintId}
        projectId={projectId}
        onClosed={() => utils.sprint.getById.invalidate({ sprintId })}
      />

      <IssueSlideOver
        open={!!slideOverIssueId}
        onOpenChange={(open) => {
          if (!open) setSlideOverIssueId(null)
        }}
        issueId={slideOverIssueId ?? ''}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
      />
    </div>
  )
}
