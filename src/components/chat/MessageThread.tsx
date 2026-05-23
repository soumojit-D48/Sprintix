'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { X, Send, Loader2, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc/provider'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'

function ReadOnlyContent({ content }: { content: any }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: content ?? '',
    editable: false,
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
    },
  })

  if (!editor) return <span>{typeof content === 'string' ? content : ''}</span>
  return <EditorContent editor={editor} />
}

export function MessageThread() {
  const threadMessageId = useChatStore((s) => s.threadMessageId)
  const setThreadMessageId = useChatStore((s) => s.setThreadMessageId)

  const { data: thread, isLoading } = trpc.message.getThread.useQuery(
    { messageId: threadMessageId ?? '' },
    { enabled: !!threadMessageId }
  )

  const utils = trpc.useUtils()

  const sendReply = trpc.message.send.useMutation({
    onSuccess: () => {
      utils.message.getThread.invalidate({ messageId: threadMessageId ?? '' })
      utils.message.list.invalidate({ channelId: thread?.parentMessage?.channelId ?? '' })
      replyEditor?.commands.clearContent()
      replyEditor?.commands.focus()
    },
    onError: (err) => toast.error(err.message),
  })

  const parent = thread?.parentMessage
  const replies = thread?.replies ?? []

  const replyEditor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Reply in thread...' }),
    ],
    editorProps: {
      handleKeyDown: (_, event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault()
          handleSendReply()
          return true
        }
        return false
      },
    },
  })

  const handleSendReply = () => {
    if (!replyEditor || !parent) return
    const json = replyEditor.getJSON()
    const isEmpty =
      !json ||
      (json as any)?.content?.length === 0 ||
      ((json as any)?.content?.length === 1 && (json as any)?.content?.[0]?.text === '')
    if (isEmpty) return

    sendReply.mutate({
      channelId: parent.channelId!,
      body: json as Record<string, any>,
      parentId: parent.id,
    })
  }

  if (!threadMessageId) return null

  return (
    <div className="bg-background flex h-full flex-col border-l">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-4" />
          <span className="font-semibold text-sm">Thread</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setThreadMessageId(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : parent ? (
        <>
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              <div className="flex gap-3">
                <Avatar className="size-8 shrink-0">
                  <AvatarImage src={parent.sender.avatarUrl ?? ''} alt={parent.sender.name ?? ''} />
                  <AvatarFallback>
                    {(parent.sender.name ?? 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold">{parent.sender.name}</span>
                    <span className="text-muted-foreground text-[11px]">
                      {new Date(parent.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-sm">
                    <ReadOnlyContent content={parent.body} />
                  </div>
                </div>
              </div>

              <div className="border-border border-t" />

              {replies.map((reply: any) => (
                <div key={reply.id} className="flex gap-3">
                  <Avatar className="size-7 shrink-0">
                    <AvatarImage src={reply.sender.avatarUrl ?? ''} alt={reply.sender.name ?? ''} />
                    <AvatarFallback>
                      {(reply.sender.name ?? 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold">{reply.sender.name}</span>
                      <span className="text-muted-foreground text-[11px]">
                        {new Date(reply.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <ReadOnlyContent content={reply.body} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-4">
            <div className="border-border focus-within:border-ring flex items-end gap-2 rounded-lg border bg-background p-1">
              <EditorContent
                editor={replyEditor}
                className="prose prose-sm max-h-24 min-h-[36px] flex-1 overflow-y-auto px-3 py-1.5"
              />
              <Button
                size="icon"
                className="mb-0.5 size-8"
                onClick={handleSendReply}
                disabled={sendReply.isPending}
              >
                <Send className="size-4" />
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground text-sm">Message not found</p>
        </div>
      )}
    </div>
  )
}
