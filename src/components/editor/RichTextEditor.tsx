'use client'

import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import ImageExtension from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Quote,
  Undo,
  Redo,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const lowlight = createLowlight(common)

interface RichTextEditorProps {
  content: unknown
  onChange: (json: unknown) => void
  placeholder?: string
  minHeight?: string
  editable?: boolean
  onDebouncedSave?: () => void
  saving?: boolean
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const tools = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      label: 'Bold',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      label: 'Italic',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive('code'),
      label: 'Code',
    },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
      label: 'Heading 1',
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
      label: 'Heading 2',
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      label: 'Bullet List',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      label: 'Ordered List',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
      label: 'Quote',
    },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          onClick={tool.action}
          className={cn(
            'flex size-7 items-center justify-center rounded text-sm transition-colors',
            tool.active
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
          title={tool.label}
        >
          <tool.icon className="size-3.5" />
        </button>
      ))}
      <span className="bg-border mx-1 h-5 w-px" />
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded text-sm disabled:opacity-30"
        title="Undo"
      >
        <Undo className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-7 items-center justify-center rounded text-sm disabled:opacity-30"
        title="Redo"
      >
        <Redo className="size-3.5" />
      </button>
    </div>
  )
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = 'Add a description...',
  minHeight = '150px',
  editable = true,
  onDebouncedSave,
  saving,
}: RichTextEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        codeBlock: false,
        link: false,
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: true }),
      ImageExtension,
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: content ?? '',
    editable,
    onUpdate: ({ editor: ed }) => {
      const json = ed.getJSON()
      onChange(json)
      if (onDebouncedSave) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(onDebouncedSave, 500)
      }
    },
  })

  if (!editor) return null

  return (
    <div
      className={cn(
        'border-border focus-within:border-ring rounded-lg border',
        !editable && 'border-transparent'
      )}
    >
      {editable && <EditorToolbar editor={editor} />}
      <div className="relative">
        <EditorContent
          editor={editor}
          className={cn(
            'prose prose-sm max-w-none px-3 py-2',
            editable ? 'cursor-text' : 'cursor-default'
          )}
          style={{ minHeight }}
        />
        {saving !== undefined && (
          <span className="text-muted-foreground absolute right-2 bottom-2 text-[10px]">
            {saving ? 'Saving...' : 'Saved'}
          </span>
        )}
      </div>
    </div>
  )
}

export function MinimalEditor({
  content,
  onChange,
  placeholder = 'Write something...',
  minHeight = '60px',
}: {
  content: unknown
  onChange: (json: unknown) => void
  placeholder?: string
  minHeight?: string
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: content ?? '',
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON())
    },
  })

  if (!editor) return null

  return (
    <div className="border-border focus-within:border-ring rounded-lg border">
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-3 py-2"
        style={{ minHeight }}
      />
    </div>
  )
}
