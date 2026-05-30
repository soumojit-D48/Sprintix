'use client'

import { create } from 'zustand'

interface NotificationItem {
  id: string
  title: string
  message: string
  read: boolean
  type: string
  entityId: string | null
  entityType: string | null
  createdAt: Date
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  setNotifications: (notifications: NotificationItem[]) => void
  addNotification: (notification: NotificationItem) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    }),
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + (notification.read ? 0 : 1),
    })),
  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
}))
