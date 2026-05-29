'use client'

import { useRealtime } from '@/hooks/use-realtime'
import { usePresence } from '@/hooks/use-presence'
import { useNotificationRealtime } from '@/hooks/use-notification-realtime'

export function RealtimeProvider({ workspaceId }: { workspaceId: string }) {
  useRealtime(workspaceId)
  usePresence(workspaceId)
  useNotificationRealtime()
  return null
}
