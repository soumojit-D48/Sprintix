'use client'

import { useState, useRef, useEffect } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const COMMON_EMOJIS = [
  '👍', '✅', '🎉', '❤️', '🚀', '👀', '😄', '😢',
  '🔥', '💯', '👎', '😊', '🤔', '😕', '🙌', '💪',
  '⭐', '🎯', '💡', '📌', '🔧', '🐛', '⚡', '🏆',
]

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  align?: 'start' | 'center' | 'end'
}

export function EmojiPicker({ onSelect, children, side = 'top', align = 'center' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side={side} align={align} className="w-fit p-1">
        <div className="grid grid-cols-8 gap-0.5">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="flex size-7 cursor-pointer items-center justify-center rounded text-sm transition-colors hover:bg-accent"
              onClick={() => {
                onSelect(emoji)
                setOpen(false)
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface ReactionSummaryProps {
  reactions: { id: string; emoji: string; userId: string }[]
  currentUserId: string | undefined
  onToggle: (emoji: string) => void
  userMap: Record<string, { name: string; avatarUrl?: string | null }> | undefined
}

export function ReactionSummary({ reactions, currentUserId, onToggle, userMap }: ReactionSummaryProps) {
  const grouped = reactions.reduce<Record<string, { count: number; reacted: boolean; users: string[] }>>(
    (acc, r) => {
      const existing = acc[r.emoji] ?? { count: 0, reacted: false, users: [] }
      existing.count++
      existing.users.push(r.userId)
      if (r.userId === currentUserId) existing.reacted = true
      acc[r.emoji] = existing
      return acc
    },
    {}
  )

  if (Object.keys(grouped).length === 0) return null

  return (
    <div className="mt-2 flex flex-wrap gap-1">
      {Object.entries(grouped).map(([emoji, data]) => {
        const names = data.users
          .map((uid) => userMap?.[uid]?.name)
          .filter(Boolean)
          .join(', ')
        const title = names ? `Reacted by: ${names}` : ''

        return (
          <button
            key={emoji}
            type="button"
            title={title}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors',
              data.reacted
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
            )}
            onClick={() => onToggle(emoji)}
          >
            <span>{emoji}</span>
            <span>{data.count}</span>
          </button>
        )
      })}
    </div>
  )
}
