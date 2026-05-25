'use client'

import { useState } from 'react'
import { Plus, GitFork } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SprintCard } from './SprintCard'
import { SprintCreateModal } from './SprintCreateModal'

interface SprintListProps {
  projectId: string
  workspaceSlug: string
}

export function SprintList({ projectId, workspaceSlug }: SprintListProps) {
  const [createOpen, setCreateOpen] = useState(false)

  const { data: sprints, isLoading } = trpc.sprint.list.useQuery({ projectId })
  const utils = trpc.useUtils()

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const activeSprint = sprints?.find((s) => s.status === 'ACTIVE')
  const plannedSprints = sprints?.filter((s) => s.status === 'PLANNED') ?? []
  const completedSprints = sprints?.filter((s) => s.status === 'COMPLETED') ?? []

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <GitFork className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Sprints</span>
          <span className="text-muted-foreground text-xs">{sprints?.length ?? 0} total</span>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create Sprint
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {/* Active sprint */}
        {activeSprint && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-600">
              Active
            </h3>
            <SprintCard
              {...activeSprint}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
            />
          </section>
        )}

        {/* Planned sprints */}
        {plannedSprints.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-600">
              Upcoming
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {plannedSprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  {...sprint}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Completed sprints */}
        {completedSprints.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Past sprints
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {completedSprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  {...sprint}
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {(!sprints || sprints.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16">
            <GitFork className="text-muted-foreground/30 size-14" />
            <h3 className="mt-4 text-base font-semibold">No sprints yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Create your first sprint to start planning work.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-1.5 size-4" />
              Create Sprint
            </Button>
          </div>
        )}
      </div>

      <SprintCreateModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onCreated={() => utils.sprint.list.invalidate({ projectId })}
      />
    </div>
  )
}
