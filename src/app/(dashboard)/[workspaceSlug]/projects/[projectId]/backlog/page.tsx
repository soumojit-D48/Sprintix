'use client'

import { useParams } from 'next/navigation'
import { Archive } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Skeleton } from '@/components/ui/skeleton'

export default function BacklogPage() {
  const params = useParams()
  const projectId = params.projectId as string

  const { data: project, isLoading } = trpc.project.getById.useQuery({ projectId })

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Skeleton className="h-64 w-full max-w-3xl rounded-lg" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-2">
          <Archive className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Backlog</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Archive className="text-muted-foreground/30 mx-auto mb-4 size-16" />
          <h3 className="text-lg font-semibold">Backlog</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage unassigned and unscheduled issues.
          </p>
          <p className="text-muted-foreground/50 mt-8 text-xs">
            Backlog management will be built alongside sprints in Phase 15.
          </p>
        </div>
      </div>
    </div>
  )
}
