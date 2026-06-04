'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function SettingsMembersRedirect() {
  const params = useParams()
  const router = useRouter()
  const workspaceSlug = params.workspaceSlug as string

  useEffect(() => {
    router.replace(`/${workspaceSlug}/members`)
  }, [workspaceSlug, router])

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  )
}
