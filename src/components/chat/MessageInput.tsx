'use client'

import { useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Send, SmilePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/provider'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageInputProps {
  channelId: string
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '✅']

export function MessageInput({ channelId }: MessageInputProps) {
  const utils = trpc.useUtils()
  const { handleTyping } = useTypingIndicator(channelId)
  const enterKeyRef = useRef(false)

  const { data: members } = trpc.channel.getMembers.useQuery(
    { channelId },
    { enabled: !!channelId }
  )

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: (result) => {
      utils.message.list.invalidate({ channelId })
      editor?.commands.clearContent()
      editor?.commands.focus()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const mentionItems =
    members?.map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
    })) ?? []

  function renderMentionList() {
    let popup: { element: HTMLElement; destroy: () => void } | null = null

    const createDropdown = (
      items: typeof mentionItems,
      command: (props: { id: string; label: string }) => void,
      rect: DOMRect
    ) => {
      const container = document.createElement('div')
      container.className =
        'border border-border bg-popover z-50 max-h-48 w-56 overflow-auto rounded-md border p-1 shadow-md'
      container.style.position = 'fixed'
      container.style.left = `${rect.left}px`
      container.style.top = `${rect.bottom + 4}px`

      items.forEach((item, index) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
          index === 0 ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
        }`
        btn.innerHTML = `<span class="font-medium">${item.name}</span>`
        btn.onmousedown = (e) => e.preventDefault()
        btn.onclick = () => {
          command({ id: item.id, label: item.name })
          container.remove()
        }
        container.appendChild(btn)
      })

      document.body.appendChild(container)
      popup = { element: container, destroy: () => container.remove() }
      return popup
    }

    return {
      onStart: (props: {
        clientRect: () => DOMRect
        items: typeof mentionItems
        command: (p: { id: string; label: string }) => void
      }) => {
        if (props.items.length === 0) return
        createDropdown(props.items, props.command, props.clientRect())
      },
      onUpdate: (props: {
        clientRect: () => DOMRect
        items: typeof mentionItems
        command: (p: { id: string; label: string }) => void
      }) => {
        popup?.destroy()
        if (props.items.length === 0) return
        createDropdown(props.items, props.command, props.clientRect())
      },
      onKeyDown: (props: { event: KeyboardEvent }) => {
        if (props.event.key === 'Escape') {
          popup?.destroy()
          return true
        }
        return false
      },
      onExit: () => {
        popup?.destroy()
        popup = null
      },
    }
  }

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Message #channel...' }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) =>
            mentionItems
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 10),
          render: renderMentionList as any,
        },
      }),
    ],
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          enterKeyRef.current = true
          handleSend()
          return true
        }
        return false
      },
    },
    onUpdate: () => {
      handleTyping()
    },
  })

  const handleSend = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    const isEmpty =
      !json ||
      (json as any)?.content?.length === 0 ||
      ((json as any)?.content?.length === 1 && (json as any)?.content?.[0]?.text === '')

    if (isEmpty) return

    sendMessage.mutate({
      channelId,
      body: json as Record<string, any>,
    })
  }, [editor, channelId, sendMessage])

  const handleEmojiSelect = (emoji: string) => {
    if (!editor) return
    editor.commands.insertContent(emoji)
  }

  if (!editor) return null

  return (
    <div className="border-t px-4 py-3">
      <div className="border-border focus-within:border-ring flex items-end gap-2 rounded-lg border bg-background p-1">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-h-32 min-h-[40px] flex-1 overflow-y-auto px-3 py-2"
        />
        <div className="flex items-center gap-1 pb-1 pr-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <SmilePlus className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="flex flex-wrap gap-1 p-2">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className="hover:bg-muted rounded p-1 text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="icon"
            className="size-8"
            onClick={handleSend}
            disabled={sendMessage.isPending}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
