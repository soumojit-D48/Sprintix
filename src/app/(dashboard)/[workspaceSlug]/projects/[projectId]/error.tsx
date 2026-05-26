'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'

export default function ProjectError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    console.error('Project page error:', error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Failed to load project data. This might be a temporary issue.
        </p>
        {error.digest && (
          <p className="text-muted-foreground mt-1 font-mono text-xs">
            Error: {error.digest}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => unstable_retry()}>
          <RefreshCw className="mr-2 size-4" />
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/${params.workspaceSlug}`)}
        >
          <Home className="mr-2 size-4" />
          Go to Workspace
        </Button>
      </div>
    </div>
  )
}
