'use client'

import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { trpc } from '@/lib/trpc/provider'
import { useNotificationStore } from '@/stores/notification-store'
import { useCurrentMember } from './use-current-member'
import { toast } from 'sonner'

export function useNotificationRealtime() {
  const utils = trpc.useUtils()
  const { userId } = useCurrentMember()
  const setNotifications = useNotificationStore((s) => s.setNotifications)

  // Fetch initial notifications list
  const { data: listData } = trpc.notification.list.useQuery(
    { limit: 20 },
    { enabled: !!userId }
  )

  // Sync initial data with Zustand store
  useEffect(() => {
    if (listData?.notifications) {
      const mapped = listData.notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.body || '',
        read: n.read,
        type: n.type,
        entityId: n.entityId,
        entityType: n.entityType,
        createdAt: new Date(n.createdAt),
      }))
      setNotifications(mapped)
    }
  }, [listData, setNotifications])

  useEffect(() => {
    if (!userId) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-user-${userId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('pusher:subscription_error', (err: any) => {
      console.error(`[Notification Realtime] Subscription error:`, err)
    })

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Notification Realtime] Subscribed to ${channelName}`)
    })

    channel.bind('notification:created', (notification: any) => {
      toast(notification.title, {
        description: notification.body,
      })

      // Invalidate queries to trigger re-fetch and update Zustand
      utils.notification.getUnreadCount.invalidate()
      utils.notification.list.invalidate()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [userId, utils])
}
