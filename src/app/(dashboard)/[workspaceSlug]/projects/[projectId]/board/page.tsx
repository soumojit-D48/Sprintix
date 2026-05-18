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
import { KanbanBoard } from '@/components/kanban/KanbanBoard'
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

  const utils = trpc.useUtils()
  const reorderMutation = trpc.issue.reorder.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate()
      utils.issue.getById.invalidate()
    },
    onError: () => {
      issueQuery.refetch()
    },
  })

  function handleCreateIssue(status: string) {
    setCreateStatus(status)
    setCreateOpen(true)
  }

  const handleDragEnd = async (issueId: string, newStatus: string, newOrder: number) => {
    reorderMutation.mutate({
      issueId,
      status: newStatus as 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED',
      order: newOrder,
    })
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
        <KanbanBoard
          columns={groupedIssues}
          onIssueClick={setSlideOverIssueId}
          onCreateIssue={handleCreateIssue}
          onDragEnd={handleDragEnd}
        />
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
