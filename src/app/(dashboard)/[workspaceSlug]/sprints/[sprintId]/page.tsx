'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SprintBoard } from '@/components/sprints/SprintBoard'

export default function SprintDetailPage() {
  const params = useParams()
  const sprintId = params.sprintId as string
  const workspaceSlug = params.workspaceSlug as string

  const { data: sprint, isLoading } = trpc.sprint.getById.useQuery({ sprintId })

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-8 w-full" />
        <div className="flex gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-72 shrink-0 rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (!sprint) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Sprint not found.</p>
        <Button variant="outline" asChild>
          <Link href={`/${workspaceSlug}/sprints`}>Back to Sprints</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-2.5">
        <Button variant="ghost" size="sm" asChild className="gap-1">
          <Link href={`/${workspaceSlug}/projects/${sprint.projectId}/sprints`}>
            <ArrowLeft className="size-3.5" />
            Sprints
          </Link>
        </Button>
        <span className="text-muted-foreground text-xs">/</span>
        <Link
          href={`/${workspaceSlug}/projects/${sprint.projectId}/board`}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          {sprint.project.name}
        </Link>
        <span className="text-muted-foreground text-xs">/</span>
        <span className="text-xs font-medium">{sprint.name}</span>
      </div>

      <SprintBoard
        sprintId={sprintId}
        projectId={sprint.projectId}
        workspaceSlug={workspaceSlug}
        workspaceId={sprint.project.workspaceId}
      />
    </div>
  )
}
