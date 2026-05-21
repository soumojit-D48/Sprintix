import { useEffect } from 'react'
import { create } from 'zustand'
import { getPusherClient } from '@/lib/pusher-client'

interface PresenceStore {
  onlineUserIds: Set<string>
  setOnlineUserIds: (ids: Set<string>) => void
  addOnlineUserId: (id: string) => void
  removeOnlineUserId: (id: string) => void
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  onlineUserIds: new Set(),
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
  addOnlineUserId: (id) => set((state) => {
    const next = new Set(state.onlineUserIds)
    next.add(id)
    return { onlineUserIds: next }
  }),
  removeOnlineUserId: (id) => set((state) => {
    const next = new Set(state.onlineUserIds)
    next.delete(id)
    return { onlineUserIds: next }
  }),
}))

export function usePresence(workspaceId?: string) {
  const { setOnlineUserIds, addOnlineUserId, removeOnlineUserId } = usePresenceStore()

  useEffect(() => {
    if (!workspaceId) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `presence-workspace-${workspaceId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('pusher:subscription_error', (err: { status?: number }) => {
      if (err.status === 403) {
        console.warn('[Presence] Access denied to presence channel')
      }
    })

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      const ids = new Set<string>()
      Object.values(members.members).forEach((member: any) => {
        ids.add(member.id)
      })
      setOnlineUserIds(ids)
    })

    channel.bind('pusher:member_added', (member: any) => {
      addOnlineUserId(member.id)
    })

    channel.bind('pusher:member_removed', (member: any) => {
      removeOnlineUserId(member.id)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
      setOnlineUserIds(new Set())
    }
  }, [workspaceId, setOnlineUserIds, addOnlineUserId, removeOnlineUserId])
}
