'use client'

import { useRealtime } from '@/hooks/use-realtime'
import { usePresence } from '@/hooks/use-presence'

export function RealtimeProvider({ workspaceId }: { workspaceId: string }) {
  useRealtime(workspaceId)
  usePresence(workspaceId)
  return null
}
