'use client'

import { useChatStore } from '@/stores/chat-store'

interface TypingIndicatorProps {
  channelId: string
}

export function TypingIndicator({ channelId }: TypingIndicatorProps) {
  const typingUsers = useChatStore((s) => s.typingUsers)
  const users = typingUsers[channelId]

  if (!users || users.length === 0) return null

  const names = users.map((u) => u.name).filter(Boolean)

  if (names.length === 0) return null

  const text =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names[0]} and ${names.length - 1} others are typing...`

  return (
    <div className="flex items-center gap-1.5 px-2 py-1">
      <span className="flex gap-0.5">
        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full" style={{ animationDelay: '0ms' }} />
        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full" style={{ animationDelay: '150ms' }} />
        <span className="bg-muted-foreground/40 size-1.5 animate-bounce rounded-full" style={{ animationDelay: '300ms' }} />
      </span>
      <span className="text-muted-foreground text-xs italic">{text}</span>
    </div>
  )
}
