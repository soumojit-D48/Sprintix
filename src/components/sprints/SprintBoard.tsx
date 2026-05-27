'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { Plus, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { KanbanColumn } from '@/components/kanban/KanbanColumn'
import { KanbanCard } from '@/components/kanban/KanbanCard'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { SprintProgress } from './SprintProgress'
import { SprintBurndown } from './SprintBurndown'
import { SprintCloseModal } from './SprintCloseModal'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const COLUMNS = [
  { key: 'BACKLOG', label: 'Backlog', color: 'bg-gray-500' },
  { key: 'TODO', label: 'Todo', color: 'bg-blue-500' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { key: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500' },
  { key: 'DONE', label: 'Done', color: 'bg-green-500' },
  { key: 'CANCELLED', label: 'Cancelled', color: 'bg-red-400' },
] as const

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

  const startSprint = trpc.sprint.start.useMutation({
    onSuccess: () => {
      utils.sprint.getById.invalidate({ sprintId })
      utils.sprint.list.invalidate({ projectId })
    },
    onError: (err) => {
      toast.error(err.message)
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

  const issues = useMemo(
    () => (sprint.issues?.map((i) => ({ ...i, dueDate: i.dueDate ?? null })) ?? []),
    [sprint.issues]
  )
  const completedIssues = useMemo(() => issues.filter((i) => i.status === 'DONE').length, [issues])

  const [columns, setColumns] = useState(
    COLUMNS.map((col) => ({
      ...col,
      issues: issues
        .filter((i) => i.status === col.key)
        .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99) || a.order - b.order),
    }))
  )
  const [activeIssue, setActiveIssue] = useState<(typeof columns)[number]['issues'][number] | null>(null)

  useEffect(() => {
    setColumns(
      COLUMNS.map((col) => ({
        ...col,
        issues: issues
          .filter((i) => i.status === col.key)
          .sort((a, b) => (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99) || a.order - b.order),
      }))
    )
  }, [issues])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const updateStatus = trpc.issue.updateStatus.useMutation({
    onSuccess: () => {
      utils.sprint.getById.invalidate({ sprintId })
      utils.sprint.list.invalidate({ projectId })
    },
  })

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    for (const col of columns) {
      const found = col.issues.find((i) => i.id === id)
      if (found) { setActiveIssue(found); break }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const isActiveTask = active.data.current?.type === 'Issue'
    const isOverTask = over.data.current?.type === 'Issue'
    const isOverColumn = over.data.current?.type === 'Column'
    if (!isActiveTask) return

    setColumns((cols) => {
      const activeColIndex = cols.findIndex((c) => c.issues.some((i) => i.id === active.id))
      let overColIndex = -1
      if (isOverTask) overColIndex = cols.findIndex((c) => c.issues.some((i) => i.id === over.id))
      else if (isOverColumn) overColIndex = cols.findIndex((c) => c.key === over.id)
      if (activeColIndex === -1 || overColIndex === -1) return cols

      const activeCol = cols[activeColIndex]
      const overCol = cols[overColIndex]
      if (!activeCol || !overCol) return cols

      if (activeCol.key === overCol.key) return cols

      const activeIssueIndex = activeCol.issues.findIndex((i) => i.id === active.id)
      const issueToMove = activeCol.issues[activeIssueIndex]
      if (!issueToMove) return cols

      let newIndex = overCol.issues.length
      if (isOverTask) {
        const overIssueIndex = overCol.issues.findIndex((i) => i.id === over.id)
        if (overIssueIndex >= 0) {
          const isBelow = over.rect && active.rect.current.translated &&
            active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          newIndex = overIssueIndex + (isBelow ? 1 : 0)
        }
      }

      const newCols = [...cols]
      newCols[activeColIndex] = { ...activeCol, issues: activeCol.issues.filter((i) => i.id !== active.id) }
      const newIssues = [...overCol.issues]
      newIssues.splice(newIndex, 0, { ...issueToMove, status: overCol.key })
      newCols[overColIndex] = { ...overCol, issues: newIssues }
      return newCols
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const originalStatus = activeIssue?.status
    setActiveIssue(null)
    const { active, over } = event
    if (!over) return
    const activeId = active.id as string

    setColumns((cols) => {
      let overColIndex = cols.findIndex((c) => c.issues.some((i) => i.id === over.id))
      if (overColIndex === -1) overColIndex = cols.findIndex((c) => c.key === over.id)
      if (overColIndex === -1) return cols

      const overCol = cols[overColIndex]
      if (!overCol) return cols

      if (originalStatus && originalStatus !== overCol.key) {
        updateStatus.mutate({ issueId: activeId, status: overCol.key })
        return cols
      }

      const activeColIndex = cols.findIndex((c) => c.issues.some((i) => i.id === activeId))
      if (activeColIndex === -1) return cols

      const activeCol = cols[activeColIndex]
      if (!activeCol) return cols

      const oldIndex = activeCol.issues.findIndex((i) => i.id === activeId)
      let newIndex = overCol.issues.findIndex((i) => i.id === over.id)
      if (newIndex === -1) newIndex = overCol.issues.length - 1
      const newIssues = arrayMove(activeCol.issues, oldIndex, newIndex)
      let newOrder = Date.now()
      if (newIssues.length > 1) {
        if (newIndex === 0) newOrder = (newIssues[1]?.order ?? Date.now()) - 1000
        else if (newIndex === newIssues.length - 1) newOrder = (newIssues[newIndex - 1]?.order ?? Date.now()) + 1000
        else {
          const prev = newIssues[newIndex - 1]
          const next = newIssues[newIndex + 1]
          if (prev && next) newOrder = (prev.order + next.order) / 2
        }
      }
      newIssues[newIndex] = { ...newIssues[newIndex], order: newOrder } as never
      const newCols = [...cols]
      newCols[activeColIndex] = { ...activeCol, issues: newIssues }
      return newCols
    })
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: '0.5' } },
    }),
  }

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
            {sprint.status === 'PLANNED' && (
              <Button
                size="sm"
                variant="default"
                onClick={() => startSprint.mutate({ sprintId })}
                disabled={startSprint.isPending}
              >
                {startSprint.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Start Sprint
              </Button>
            )}
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 gap-6 overflow-auto p-6">
          <div className="flex flex-1 gap-4">
            {columns.map((col) => (
              <KanbanColumn
                key={col.key}
                column={col}
                onIssueClick={setSlideOverIssueId}
                onCreateIssue={() => {}}
              />
            ))}
          </div>

          {stats && stats.burndownData.length > 0 && (
            <div className="w-80 shrink-0">
              <SprintBurndown data={stats.burndownData} />
            </div>
          )}
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeIssue ? (
            <KanbanCard issue={activeIssue as never} onClick={() => {}} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

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
