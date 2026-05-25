'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { SprintBoard } from '@/components/sprints/SprintBoard'

export default function ProjectSprintDetailPage() {
  const params = useParams()
  const sprintId = params.sprintId as string
  const projectId = params.projectId as string
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
          <Link href={`/${workspaceSlug}/projects/${projectId}/sprints`}>
            Back to Sprints
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <SprintBoard
      sprintId={sprintId}
      projectId={projectId}
      workspaceSlug={workspaceSlug}
      workspaceId={sprint.project.workspaceId}
    />
  )
}
