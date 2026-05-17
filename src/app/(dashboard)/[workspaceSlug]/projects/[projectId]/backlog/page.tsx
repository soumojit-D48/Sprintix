'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Archive, Plus, Circle, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { cn } from '@/lib/utils'

const STATUS_META: Record<string, { label: string; color: string; order: number }> = {
  BACKLOG: { label: 'Backlog', color: 'text-gray-400', order: 0 },
  TODO: { label: 'Todo', color: 'text-blue-500', order: 1 },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-500', order: 2 },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-500', order: 3 },
  DONE: { label: 'Done', color: 'text-green-500', order: 4 },
  CANCELLED: { label: 'Cancelled', color: 'text-red-400', order: 5 },
}

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  URGENT: { label: 'Urgent', color: 'text-red-500' },
  HIGH: { label: 'High', color: 'text-orange-500' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-500' },
  LOW: { label: 'Low', color: 'text-blue-500' },
  NO_PRIORITY: { label: '—', color: 'text-muted-foreground' },
}

export default function BacklogPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const { data: project } = trpc.project.getById.useQuery({ projectId })

  const { data: backlogIssues = [], isLoading, refetch } = trpc.issue.listBacklog.useQuery({
    projectId,
    search: search.trim() || undefined,
  })

  // Group by status
  const grouped = backlogIssues.reduce<Record<string, typeof backlogIssues>>((acc, issue) => {
    const key = issue.status
    if (!acc[key]) acc[key] = []
    acc[key]!.push(issue)
    return acc
  }, {})

  const sortedStatuses = Object.keys(grouped).sort(
    (a, b) => (STATUS_META[a]?.order ?? 99) - (STATUS_META[b]?.order ?? 99)
  )

  function toggleGroup(status: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const totalCount = backlogIssues.length

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Archive className="text-muted-foreground size-4" />
            <span className="text-sm font-medium">Backlog</span>
          </div>
          <Badge variant="secondary" className="text-xs">
            {totalCount} issue{totalCount !== 1 ? 's' : ''}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              placeholder="Search backlog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-52 pl-8 text-sm"
            />
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Add Issue
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2 p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-lg" />
          ))}
        </div>
      ) : totalCount === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Archive className="text-muted-foreground/30 size-14" />
          <div className="text-center">
            <h3 className="text-base font-semibold">
              {search ? 'No matching issues' : 'Backlog is empty'}
            </h3>
            <p className="text-muted-foreground mt-1 text-sm">
              {search
                ? 'Try a different search term.'
                : 'Issues not assigned to any sprint will appear here.'}
            </p>
          </div>
          {!search && (
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 size-4" />
              Add to Backlog
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {sortedStatuses.map((status) => {
            const issues = grouped[status] ?? []
            const meta = STATUS_META[status]
            const isCollapsed = collapsedGroups.has(status)

            return (
              <div key={status}>
                {/* Group header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(status)}
                  className="hover:bg-muted/50 flex w-full items-center gap-2 border-b px-6 py-2.5 transition-colors"
                >
                  {isCollapsed ? (
                    <ChevronRight className="text-muted-foreground size-3.5" />
                  ) : (
                    <ChevronDown className="text-muted-foreground size-3.5" />
                  )}
                  <Circle
                    className={cn('size-2.5 fill-current', meta?.color ?? 'text-gray-400')}
                  />
                  <span className="text-sm font-medium">{meta?.label ?? status}</span>
                  <span className="text-muted-foreground text-xs">{issues.length}</span>
                </button>

                {/* Issues in group */}
                {!isCollapsed && (
                  <div className="divide-y">
                    {issues.map((issue) => {
                      const isOverdue =
                        !!issue.dueDate && new Date(issue.dueDate) < new Date()
                      const priorityMeta = PRIORITY_META[issue.priority]

                      return (
                        <div
                          key={issue.id}
                          className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-6 py-2.5 transition-colors"
                          onClick={() => setSlideOverIssueId(issue.id)}
                        >
                          {/* Priority indicator */}
                          <span
                            className={cn(
                              'w-14 shrink-0 text-xs font-medium',
                              priorityMeta?.color ?? 'text-muted-foreground'
                            )}
                          >
                            {priorityMeta?.label ?? issue.priority}
                          </span>

                          {/* Identifier */}
                          <IssueIdentifier identifier={issue.identifier} />

                          {/* Title */}
                          <span className="flex-1 truncate text-sm">{issue.title}</span>

                          {/* Sub-issue count */}
                          {issue._count.subIssues > 0 && (
                            <span className="text-muted-foreground shrink-0 text-xs">
                              {issue._count.subIssues} sub
                            </span>
                          )}

                          {/* Comment count */}
                          {issue._count.comments > 0 && (
                            <span className="text-muted-foreground shrink-0 text-xs">
                              💬 {issue._count.comments}
                            </span>
                          )}

                          {/* Labels */}
                          <div className="hidden shrink-0 gap-1 md:flex">
                            {issue.labels?.slice(0, 2).map(({ label }) => (
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

                          {/* Due date */}
                          {issue.dueDate && (
                            <span
                              className={cn(
                                'shrink-0 text-xs',
                                isOverdue
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

                          {/* Assignee */}
                          {issue.assignee ? (
                            <Avatar className="size-5 shrink-0">
                              <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                              <AvatarFallback className="text-[9px]">
                                {issue.assignee.name?.charAt(0) ?? 'U'}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="bg-muted size-5 shrink-0 rounded-full" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      {project && (
        <>
          <IssueCreateModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={projectId}
            workspaceId={project.workspaceId}
            workspaceSlug={workspaceSlug}
            onCreated={refetch}
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
