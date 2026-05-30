'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { Send, SmilePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { trpc } from '@/lib/trpc/provider'
import { useTypingIndicator } from '@/hooks/use-typing-indicator'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface MessageInputProps {
  channelId: string
  workspaceId: string
  channelType?: string
  currentUserId?: string
}

const EMOJI_LIST = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '✅']

export function MessageInput({ channelId, workspaceId, channelType, currentUserId }: MessageInputProps) {
  const utils = trpc.useUtils()
  const { handleTyping } = useTypingIndicator(channelId)
  const editingMessage = useChatStore((s) => s.editingMessage)
  const clearEditingMessage = useChatStore((s) => s.clearEditingMessage)

  const isDM = channelType === 'DM'

  const { data: channelMembers } = trpc.channel.getMembers.useQuery(
    { channelId },
    { enabled: !!channelId && isDM }
  )

  const { data: workspaceMembers } = trpc.member.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId && !isDM }
  )

  const isEditing = editingMessage?.channelId === channelId

  const sendMessage = trpc.message.send.useMutation({
    onSuccess: () => {
      utils.message.list.invalidate({ channelId })
      editor?.commands.clearContent()
      editor?.commands.focus()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const editMessage = trpc.message.edit.useMutation({
    onSuccess: (result) => {
      utils.message.list.setInfiniteData({ channelId, limit: 50 }, (old) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m: any) =>
              m.id === result.id ? { ...m, body: result.body, editedAt: result.editedAt } : m
            ),
          })),
        }
      })
      clearEditingMessage()
      editor?.commands.clearContent()
      editor?.commands.focus()
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const members = isDM ? channelMembers : workspaceMembers

  const mentionItems =
    members?.map((m: any) => ({
      id: m.user.id,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
    })) ?? []

  const mentionItemsRef = useRef(mentionItems)
  mentionItemsRef.current = mentionItems

  function renderMentionList(currentUserId?: string) {
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
      container.style.visibility = 'hidden'
      container.style.pointerEvents = 'none'

      items.forEach((item, index) => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = `flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${
          index === 0 ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
        }`
        const avatarHtml = item.avatarUrl
          ? `<img src="${item.avatarUrl}" alt="" class="size-5 rounded-full object-cover" />`
          : `<span class="flex size-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">${item.name.charAt(0)}</span>`
        const isYou = item.id === currentUserId
        btn.innerHTML = `${avatarHtml}<span class="font-medium">${item.name}</span>${isYou ? '<span class="ml-auto text-[10px] text-muted-foreground">(you)</span>' : ''}`
        btn.onmousedown = (e) => e.preventDefault()
        btn.onclick = () => {
          command({ id: item.id, label: item.name })
          container.remove()
        }
        container.appendChild(btn)
      })

      document.body.appendChild(container)
      const height = container.getBoundingClientRect().height
      container.remove()
      container.style.visibility = ''
      container.style.pointerEvents = ''

      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow >= height) {
        container.style.top = `${rect.bottom + 4}px`
      } else {
        container.style.top = `${Math.max(4, rect.top - height - 4)}px`
      }
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
      Placeholder.configure({ placeholder: isEditing ? 'Edit message...' : 'Message #channel...' }),
      Mention.configure({
        HTMLAttributes: { class: 'mention' },
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) =>
            mentionItemsRef.current
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 10),
          render: () => renderMentionList(currentUserId) as any,
        },
      }),
    ],
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          handleSend()
          return true
        }
        if (event.key === 'Escape' && isEditing) {
          clearEditingMessage()
          editor?.commands.clearContent()
          return true
        }
        return false
      },
    },
    onUpdate: () => {
      handleTyping()
    },
  })

  useEffect(() => {
    if (isEditing && editingMessage && editor) {
      editor.commands.setContent(editingMessage.body)
      editor.commands.focus()
    }
  }, [isEditing, editingMessage?.id])

  const handleSend = useCallback(() => {
    if (!editor) return
    const json = editor.getJSON()
    const content = (json as any)?.content
    const isEmpty =
      !content ||
      content.length === 0 ||
      (content.length === 1 && content[0]?.type === 'paragraph' && (!content[0]?.content || content[0].content.length === 0))

    if (isEmpty) return

    if (isEditing && editingMessage) {
      editMessage.mutate({
        messageId: editingMessage.id,
        body: json as Record<string, any>,
      })
    } else {
      sendMessage.mutate({
        channelId,
        body: json as Record<string, any>,
      })
    }
  }, [editor, channelId, sendMessage, isEditing, editingMessage, editMessage])

  const handleCancelEdit = () => {
    clearEditingMessage()
    editor?.commands.clearContent()
    editor?.commands.focus()
  }

  const handleEmojiSelect = (emoji: string) => {
    if (!editor) return
    editor.commands.insertContent(emoji)
  }

  if (!editor) return null

  return (
    <div className="border-t px-4 py-3">
      {isEditing && (
        <div className="mb-1 flex items-center justify-between rounded-t-lg bg-muted/50 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Pencil className="text-muted-foreground size-3.5" />
            <span className="text-muted-foreground text-xs font-medium">Editing message</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-5"
            onClick={handleCancelEdit}
          >
            <X className="size-3" />
          </Button>
        </div>
      )}
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
            disabled={sendMessage.isPending || editMessage.isPending}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function Pencil(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  )
}
