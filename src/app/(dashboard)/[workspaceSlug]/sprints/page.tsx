'use client'

import { useParams } from 'next/navigation'
import { GitFork } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SprintCard } from '@/components/sprints/SprintCard'

export default function SprintsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const workspaceId = workspace?.id

  const { data: projects } = trpc.project.list.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: !!workspaceId }
  )

  const { data: sprints, isLoading } = trpc.sprint.listByWorkspace.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: !!workspaceId }
  )

  if (isLoading || !workspaceId) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  const activeSprints = sprints?.filter((s) => s.status === 'ACTIVE') ?? []
  const plannedSprints = sprints?.filter((s) => s.status === 'PLANNED') ?? []
  const completedSprints = sprints?.filter((s) => s.status === 'COMPLETED') ?? []

  const projectMap = new Map(
    (projects ?? []).map((p) => [p.id, { name: p.name, identifier: p.identifier }])
  )

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <GitFork className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Sprints</span>
          <span className="text-muted-foreground text-xs">
            {(sprints?.length ?? 0) + ' total'}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-auto p-6">
        {activeSprints.length > 0 && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-green-600">
              Active
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              {activeSprints.map((sprint) => (
                <SprintCard
                  key={sprint.id}
                  {...sprint}
                  workspaceSlug={workspaceSlug}
                  projectId={sprint.projectId}
                />
              ))}
            </div>
          </section>
        )}

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
                  projectId={sprint.projectId}
                />
              ))}
            </div>
          </section>
        )}

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
                  projectId={sprint.projectId}
                />
              ))}
            </div>
          </section>
        )}

        {(!sprints || sprints.length === 0) && (
          <div className="flex flex-col items-center justify-center py-16">
            <GitFork className="text-muted-foreground/30 size-14" />
            <h3 className="mt-4 text-base font-semibold">No sprints yet</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              Sprints from all projects will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
