'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Mention from '@tiptap/extension-mention'
import { cn } from '@/lib/utils'

interface MentionItem {
  id: string
  name: string
  avatarUrl?: string | null
}

interface CommentEditorProps {
  content: unknown
  onChange: (json: unknown) => void
  placeholder?: string
  minHeight?: string
  members?: MentionItem[]
}

function renderMentionList() {
  let popup: { element: HTMLElement; destroy: () => void } | null = null

  const createDropdown = (
    items: MentionItem[],
    command: (props: { id: string; label: string }) => void,
    rect: DOMRect
  ) => {
    const container = document.createElement('div')
    container.className = 'border border-border bg-popover z-50 max-h-48 w-56 overflow-auto rounded-md border p-1 shadow-md'
    container.style.position = 'fixed'
    container.style.left = `${rect.left}px`
    container.style.top = `${rect.bottom + 4}px`

    items.forEach((item, index) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = `flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors ${index === 0 ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`
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
    onStart: (props: { clientRect: () => DOMRect; items: MentionItem[]; command: (p: { id: string; label: string }) => void }) => {
      if (props.items.length === 0) return
      createDropdown(props.items, props.command, props.clientRect())
    },

    onUpdate: (props: { clientRect: () => DOMRect; items: MentionItem[]; command: (p: { id: string; label: string }) => void }) => {
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

export function CommentEditor({
  content,
  onChange,
  placeholder = 'Add a comment...',
  minHeight = '80px',
  members = [],
}: CommentEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Mention.configure({
        HTMLAttributes: {
          class: 'mention',
        },
        suggestion: {
          char: '@',
          items: ({ query }: { query: string }) =>
            members
              .filter((m) => m.name.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 10),
          render: renderMentionList as any,
        },
      }),
    ],
    content: content ?? '',
    editable: true,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON())
    },
  })

  if (!editor) return null

  return (
    <div className={cn('border-border focus-within:border-ring rounded-lg border')}>
      <EditorContent
        editor={editor}
        className={cn('prose prose-sm max-w-none px-3 py-2', 'cursor-text')}
        style={{ minHeight }}
      />
    </div>
  )
}
