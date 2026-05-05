'use client'

import { create } from 'zustand'

interface NotificationState {
  notifications: {
    id: string
    title: string
    message: string
    read: boolean
    createdAt: Date
  }[]
  unreadCount: number
  setNotifications: (notifications: NotificationState['notifications']) => void
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
