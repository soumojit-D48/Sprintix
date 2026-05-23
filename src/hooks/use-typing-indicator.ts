import { useCallback, useRef } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { useChatStore } from '@/stores/chat-store'
import { useParams } from 'next/navigation'

const TYPING_TIMEOUT = 3000
const TYPING_DEBOUNCE = 1500

export function useTypingIndicator(channelId: string) {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingEvent = useRef<number>(0)
  const currentUserId = useRef<string | null>(null)

  const addTypingUser = useChatStore((s) => s.addTypingUser)
  const removeTypingUser = useChatStore((s) => s.removeTypingUser)

  const sendTypingStart = useCallback(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    const now = Date.now()
    if (now - lastTypingEvent.current < TYPING_DEBOUNCE) return
    lastTypingEvent.current = now

    pusher.send_event('client-typing:start', {
      channelId,
      userId: currentUserId.current,
      name: '',
    }, `private-workspace-${workspaceSlug}`)
  }, [channelId, workspaceSlug])

  const sendTypingStop = useCallback(() => {
    const pusher = getPusherClient()
    if (!pusher) return

    pusher.send_event('client-typing:stop', {
      channelId,
      userId: currentUserId.current,
    }, `private-workspace-${workspaceSlug}`)
  }, [channelId, workspaceSlug])

  const handleTyping = useCallback(() => {
    sendTypingStart()

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop()
    }, TYPING_TIMEOUT)
  }, [sendTypingStart, sendTypingStop])

  // Hook into Pusher channel for incoming typing events
  const handleIncomingTypingStart = useCallback(
    (data: { channelId: string; userId: string; name: string }) => {
      if (data.channelId === channelId && data.userId !== currentUserId.current) {
        addTypingUser(channelId, data.userId, data.name)
        setTimeout(() => {
          removeTypingUser(channelId, data.userId)
        }, TYPING_TIMEOUT)
      }
    },
    [channelId, addTypingUser, removeTypingUser]
  )

  const handleIncomingTypingStop = useCallback(
    (data: { channelId: string; userId: string }) => {
      if (data.channelId === channelId) {
        removeTypingUser(channelId, data.userId)
      }
    },
    [channelId, removeTypingUser]
  )

  return {
    handleTyping,
    handleIncomingTypingStart,
    handleIncomingTypingStop,
  }
}
