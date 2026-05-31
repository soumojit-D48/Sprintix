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
  const addNotification = useNotificationStore((s) => s.addNotification)

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
      console.warn(`[Notification Realtime] Subscription error, retrying in 5s:`, err)
      setTimeout(() => {
        pusher.unsubscribe(channelName)
        pusher.subscribe(channelName)
      }, 5000)
    })

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Notification Realtime] Subscribed to ${channelName}`)
    })

    channel.bind('notification:created', (notification: any) => {
      toast(notification.title, {
        description: notification.body,
      })

      // Optimistic +1 update
      addNotification({
        id: notification.id,
        title: notification.title,
        message: notification.body || '',
        read: notification.read,
        type: notification.type,
        entityId: notification.entityId,
        entityType: notification.entityType,
        createdAt: new Date(notification.createdAt),
      })

      // Background sync for consistency
      utils.notification.getUnreadCount.invalidate()
      utils.notification.list.invalidate()
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [userId, utils])
}
