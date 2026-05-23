import { create } from 'zustand'

interface TypingUser {
  userId: string
  name: string
  expiresAt: number
}

interface ChatState {
  activeChannelId: string | null
  unreadCounts: Record<string, number>
  typingUsers: Record<string, TypingUser[]>
  threadMessageId: string | null
  searchOpen: boolean

  setActiveChannel: (channelId: string | null) => void
  setUnreadCount: (channelId: string, count: number) => void
  setUnreadCounts: (counts: Record<string, number>) => void
  markChannelRead: (channelId: string) => void
  addTypingUser: (channelId: string, userId: string, name: string) => void
  removeTypingUser: (channelId: string, userId: string) => void
  clearTypingUsers: (channelId: string) => void
  setThreadMessageId: (messageId: string | null) => void
  setSearchOpen: (open: boolean) => void
}

export const useChatStore = create<ChatState>()((set) => ({
  activeChannelId: null,
  unreadCounts: {},
  typingUsers: {},
  threadMessageId: null,
  searchOpen: false,

  setActiveChannel: (channelId) => set({ activeChannelId: channelId }),

  setUnreadCount: (channelId, count) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [channelId]: count },
    })),

  setUnreadCounts: (counts) => set({ unreadCounts: counts }),

  markChannelRead: (channelId) =>
    set((state) => {
      const next = { ...state.unreadCounts }
      delete next[channelId]
      return { unreadCounts: next }
    }),

  addTypingUser: (channelId, userId, name) =>
    set((state) => {
      const current = state.typingUsers[channelId] || []
      if (current.some((t) => t.userId === userId)) return state
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: [...current, { userId, name, expiresAt: Date.now() + 3000 }],
        },
      }
    }),

  removeTypingUser: (channelId, userId) =>
    set((state) => {
      const current = state.typingUsers[channelId] || []
      return {
        typingUsers: {
          ...state.typingUsers,
          [channelId]: current.filter((t) => t.userId !== userId),
        },
      }
    }),

  clearTypingUsers: (channelId) =>
    set((state) => {
      const next = { ...state.typingUsers }
      delete next[channelId]
      return { typingUsers: next }
    }),

  setThreadMessageId: (messageId) => set({ threadMessageId: messageId }),

  setSearchOpen: (open) => set({ searchOpen: open }),
}))
