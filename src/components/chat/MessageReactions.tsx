'use client'

import { useState } from 'react'
import { SmilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/provider'

interface MessageReactionsProps {
  message: {
    id: string
    channelId: string | null
    reactions?: Array<{ emoji: string }>
  }
  threadRootId?: string
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀']

export function MessageReactions({ message, threadRootId }: MessageReactionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const utils = trpc.useUtils()

  const invalidateThread = () => {
    if (threadRootId) {
      utils.message.getThread.invalidate({ messageId: threadRootId })
    }
  }

  const reactMutation = trpc.message.react.useMutation({
    onSuccess: () => {
      if (message.channelId) utils.message.list.invalidate({ channelId: message.channelId })
      invalidateThread()
    },
  })

  const unreactMutation = trpc.message.unreact.useMutation({
    onSuccess: () => {
      if (message.channelId) utils.message.list.invalidate({ channelId: message.channelId })
      invalidateThread()
    },
  })

  const handleReact = (emoji: string) => {
    const existing = message.reactions?.find((r) => r.emoji === emoji)
    if (existing) {
      unreactMutation.mutate({ messageId: message.id, emoji })
    } else {
      reactMutation.mutate({ messageId: message.id, emoji })
    }
    setShowEmojiPicker(false)
  }

  const groupedReactions: Record<string, number> = {}
  if (message.reactions) {
    for (const r of message.reactions) {
      groupedReactions[r.emoji] = (groupedReactions[r.emoji] ?? 0) + 1
    }
  }

  const hasReactions = Object.keys(groupedReactions).length > 0

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {hasReactions && (
        <>
          {Object.entries(groupedReactions).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="bg-muted hover:bg-muted/80 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs transition-colors"
            >
              <span>{emoji}</span>
              <span className="text-muted-foreground">{count}</span>
            </button>
          ))}
        </>
      )}
      <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-5 text-muted-foreground hover:text-foreground"
          >
            <SmilePlus className="size-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="flex w-auto min-w-0 flex-wrap gap-1 p-1.5">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReact(emoji)}
              className="hover:bg-muted rounded p-1 text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
