'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function ProjectRootRedirect() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/${params.workspaceSlug}/projects/${params.projectId}/board`)
  }, [params.workspaceSlug, params.projectId, router])

  return null
}
