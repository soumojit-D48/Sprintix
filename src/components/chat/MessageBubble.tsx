'use client'

import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Trash2,
  SmilePlus,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { trpc } from '@/lib/trpc/provider'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'

interface MessageBubbleProps {
  message: any
  isFirstInGroup: boolean
  isLastInGroup: boolean
  workspaceSlug: string
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀']

export function MessageBubble({ message, isFirstInGroup, workspaceSlug }: MessageBubbleProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const utils = trpc.useUtils()
  const setThreadMessageId = useChatStore((s) => s.setThreadMessageId)

  const reactMutation = trpc.message.react.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate({ channelId: message.channelId })
    },
  })

  const unreactMutation = trpc.message.unreact.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate({ channelId: message.channelId })
    },
  })

  const deleteMutation = trpc.message.delete.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate({ channelId: message.channelId })
      toast.success('Message deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleReact = (emoji: string) => {
    const existing = message.reactions?.find(
      (r: any) => r.emoji === emoji
    )
    if (existing) {
      unreactMutation.mutate({ messageId: message.id, emoji })
    } else {
      reactMutation.mutate({ messageId: message.id, emoji })
    }
    setShowEmojiPicker(false)
  }

  const handleDelete = () => {
    if (confirm('Delete this message?')) {
      deleteMutation.mutate({ messageId: message.id })
    }
  }

  const timeStr = new Date(message.createdAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const groupedReactions: Record<string, number> = {}
  if (message.reactions) {
    for (const r of message.reactions) {
      groupedReactions[r.emoji] = (groupedReactions[r.emoji] ?? 0) + 1
    }
  }

  return (
    <div className="group relative flex gap-2 px-2 py-0.5 hover:bg-muted/30 transition-colors">
      {isFirstInGroup ? (
        <Avatar className="mt-1 size-8 shrink-0">
          <AvatarImage src={message.sender.avatarUrl ?? ''} alt={message.sender.name ?? ''} />
          <AvatarFallback className="text-[10px]">
            {(message.sender.name ?? 'U').charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="size-8 shrink-0" />
      )}

      <div className="min-w-0 flex-1">
        {isFirstInGroup && (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold">{message.sender.name}</span>
            <span className="text-muted-foreground text-[11px]">{timeStr}</span>
            {message.editedAt && (
              <span className="text-muted-foreground text-[10px]">(edited)</span>
            )}
          </div>
        )}

        <div className="text-sm">
          <MessageRenderer content={message.body} />
        </div>

        {Object.keys(groupedReactions).length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
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
          </div>
        )}

        {message._count?.replies > 0 && (
          <button
            onClick={() => setThreadMessageId(message.id)}
            className="text-primary hover:text-primary/80 mt-1 flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <MessageSquare className="size-3" />
            {message._count.replies} {message._count.replies === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      <div className="absolute top-0 right-2 hidden gap-0.5 group-hover:flex">
        <DropdownMenu open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <SmilePlus className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex gap-1 p-1.5">
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
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => setThreadMessageId(message.id)}
        >
          <MessageSquare className="size-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-6">
              <MoreHorizontal className="size-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDelete}>
              <Trash2 className="mr-2 size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

function MessageRenderer({ content }: { content: any }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: content ?? '',
    editable: false,
    editorProps: { attributes: { class: 'prose prose-sm max-w-none focus:outline-none' } },
  })

  if (!editor) return <span>{typeof content === 'string' ? content : ''}</span>

  return <EditorContent editor={editor} />
}
