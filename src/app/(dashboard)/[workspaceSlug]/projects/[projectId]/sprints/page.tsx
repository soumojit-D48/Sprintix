'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { SprintList } from '@/components/sprints/SprintList'

export default function ProjectSprintsPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  return (
    <Suspense fallback={null}>
      <SprintList projectId={projectId} workspaceSlug={workspaceSlug} />
    </Suspense>
  )
}
