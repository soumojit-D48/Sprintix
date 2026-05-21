'use client'

import { useState, type ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Pencil, Trash2, MoreHorizontal, Reply } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MinimalEditor } from '@/components/editor/RichTextEditor'
import { CommentEditor } from '@/components/editor/CommentEditor'
import { EmojiPicker, ReactionSummary } from '@/components/shared/EmojiPicker'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ACTION_LABELS: Record<string, (meta: Record<string, unknown>) => string> = {
  created: () => 'created this issue',
  commented: () => 'commented',
  status_changed: (meta) => {
    const from = (meta.from as string)?.replace(/_/g, ' ').toLowerCase() ?? 'unknown'
    const to = (meta.to as string)?.replace(/_/g, ' ').toLowerCase() ?? 'unknown'
    return `changed status from ${from} → ${to}`
  },
  priority_changed: (meta) => {
    const from = (meta.from as string)?.replace(/_/g, ' ').toLowerCase() ?? 'unknown'
    const to = (meta.to as string)?.replace(/_/g, ' ').toLowerCase() ?? 'unknown'
    return `changed priority from ${from} → ${to}`
  },
  assigned: (meta) => {
    if (meta.to) return 'assigned this issue'
    return 'unassigned this issue'
  },
  title_changed: () => 'changed the title',
  description_changed: () => 'updated the description',
  dueDate_changed: (meta) => {
    if (meta.to) return 'set a due date'
    return 'removed the due date'
  },
  sprint_changed: (meta) => {
    if (meta.to) return 'added to sprint'
    return 'removed from sprint'
  },
}

interface IssueActivityFeedProps {
  issueId: string
  workspaceId?: string
  currentUserId?: string
}

export function IssueActivityFeed({ issueId, workspaceId, currentUserId }: IssueActivityFeedProps) {
  const { data: feed, isLoading } = trpc.comment.getActivityFeed.useQuery({ issueId })
  const { data: members } = trpc.member.list.useQuery(
    { workspaceId: workspaceId ?? '' },
    { enabled: !!workspaceId }
  )
  const utils = trpc.useUtils()

  const createComment = trpc.comment.create.useMutation({
    onSuccess: () => {
      utils.comment.getActivityFeed.invalidate({ issueId })
      utils.issue.getById.invalidate({ issueId })
    },
    onError: (err) => toast.error(err.message),
  })

  const updateComment = trpc.comment.update.useMutation({
    onSuccess: () => utils.comment.getActivityFeed.invalidate({ issueId }),
    onError: (err) => toast.error(err.message),
  })

  const deleteComment = trpc.comment.delete.useMutation({
    onSuccess: () => utils.comment.getActivityFeed.invalidate({ issueId }),
    onError: (err) => toast.error(err.message),
  })

  const react = trpc.comment.react.useMutation({
    onSuccess: () => utils.comment.getActivityFeed.invalidate({ issueId }),
  })

  const unreact = trpc.comment.unreact.useMutation({
    onSuccess: () => utils.comment.getActivityFeed.invalidate({ issueId }),
  })

  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState<unknown>(null)
  const [newComment, setNewComment] = useState<unknown>(null)

  function handleReactionToggle(commentId: string, emoji: string) {
    const item = feed?.find((f) => 'id' in f && f.id === commentId)
    if (!item || !('reactions' in item)) return
    const reactions = item.reactions as { userId: string; emoji: string }[]
    const alreadyReacted = reactions.some((r) => r.userId === currentUserId && r.emoji === emoji)
    if (alreadyReacted) {
      unreact.mutate({ commentId, emoji })
    } else {
      react.mutate({ commentId, emoji })
    }
  }

  function handleEditComment(commentId: string, body: unknown) {
    setEditBody(body)
    setEditingId(commentId)
  }

  function handleSaveEdit() {
    if (!editingId || !editBody) return
    updateComment.mutate({ commentId: editingId, body: editBody as Record<string, unknown> }, {
      onSuccess: () => {
        setEditingId(null)
        setEditBody(null)
      },
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="bg-muted size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="bg-muted h-3 w-24 rounded" />
              <div className="bg-muted h-16 w-full rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {feed?.map((item) => {
        if (item.type === 'activity') {
          const activity = item as any
          const labelFn = ACTION_LABELS[activity.action]
          const label = labelFn ? labelFn(activity.metadata as Record<string, unknown> ?? {}) : activity.action.replace(/_/g, ' ')
          const timeAgo = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })

          return (
            <div key={activity.id} className="flex items-start gap-3 py-3">
              <Avatar className="size-6">
                <AvatarImage src={activity.user?.avatarUrl ?? undefined} />
                <AvatarFallback className="text-xs">
                  {activity.user?.name?.charAt(0) ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-muted-foreground text-sm">
                  <span className="text-foreground font-medium">{activity.user?.name ?? 'Unknown'}</span>{' '}
                  {label}
                </p>
                <p className="text-muted-foreground text-xs mt-0.5">{timeAgo}</p>
              </div>
            </div>
          )
        }

        const comment = item as any
        const isOwn = comment.authorId === currentUserId
        const timeAgo = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })
        const isEditing = editingId === comment.id

        return (
          <div key={comment.id} className="group flex items-start gap-3 py-3">
            <Avatar className="size-8 shrink-0">
              <AvatarImage src={comment.author?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">
                {comment.author?.name?.charAt(0) ?? '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{comment.author?.name ?? 'Unknown'}</span>
                <span className="text-muted-foreground text-xs">{timeAgo}</span>
                {comment.editedAt && (
                  <span className="text-muted-foreground text-xs">(edited)</span>
                )}
                {isOwn && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreHorizontal className="text-muted-foreground size-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditComment(comment.id, comment.body)}>
                        <Pencil className="mr-2 size-3.5" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => deleteComment.mutate({ commentId: comment.id })}
                      >
                        <Trash2 className="mr-2 size-3.5" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {isEditing ? (
                <div className="mt-2 space-y-2">
                  <MinimalEditor
                    content={editBody ?? comment.body}
                    onChange={setEditBody}
                    placeholder="Edit comment..."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={!editBody}>
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditBody(null) }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="prose prose-sm mt-1 max-w-none">
                  <TipTapRenderer content={comment.body} />
                </div>
              )}

              <ReactionSummary
                reactions={comment.reactions ?? []}
                currentUserId={currentUserId ?? undefined}
                onToggle={(emoji) => handleReactionToggle(comment.id, emoji)}
              />

              <div className="mt-1 flex items-center gap-2">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                >
                  <Reply className="size-3" />
                  Reply
                </button>
                <EmojiPicker
                  onSelect={(emoji) => handleReactionToggle(comment.id, emoji)}
                  side="top"
                  align="start"
                >
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                  >
                    <span className="text-sm">😊</span>
                  </button>
                </EmojiPicker>
              </div>

              {replyTo === comment.id && (
                <div className="mt-2 ml-4 space-y-2 border-l-2 border-border pl-3">
                  <MinimalEditor
                    content={newComment}
                    onChange={setNewComment}
                    placeholder="Write a reply..."
                  />
                  <Button
                    size="sm"
                    disabled={!newComment}
                    onClick={() => {
                      createComment.mutate({
                        issueId,
                        body: newComment as Record<string, unknown>,
                        parentId: comment.id,
                      }, {
                        onSuccess: () => {
                          setReplyTo(null)
                          setNewComment(null)
                        },
                      })
                    }}
                  >
                    Reply
                  </Button>
                </div>
              )}

              {comment.replies?.length > 0 && (
                <div className="mt-2 ml-4 space-y-3 border-l-2 border-border pl-3">
                  {comment.replies.map((reply: any) => (
                    <CommentReply
                      key={reply.id}
                      reply={reply}
                      currentUserId={currentUserId ?? undefined}
                      onReactionToggle={(emoji) => handleReactionToggle(reply.id, emoji)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* New comment input */}
      <div className="mt-4 flex items-start gap-3 pt-4 border-t">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">Y</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <CommentEditor
            content={newComment}
            onChange={setNewComment}
            placeholder="Add a comment..."
            members={(members ?? []).map((m: any) => ({
              id: m.user.id,
              name: m.user.name,
              avatarUrl: m.user.avatarUrl,
            }))}
          />
          <Button
            size="sm"
            disabled={!newComment}
            onClick={() => {
              createComment.mutate({
                issueId,
                body: newComment as Record<string, unknown>,
              }, {
                onSuccess: () => setNewComment(null),
              })
            }}
          >
            <MessageSquare className="mr-1.5 size-3.5" />
            Comment
          </Button>
        </div>
      </div>
    </div>
  )
}

function CommentReply({
  reply,
  currentUserId,
  onReactionToggle,
}: {
  reply: any
  currentUserId: string | undefined
  onReactionToggle: (emoji: string) => void
}) {
  const timeAgo = formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })

  return (
    <div className="py-2">
      <div className="flex items-center gap-2">
        <Avatar className="size-5">
          <AvatarImage src={reply.author?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-[10px]">
            {reply.author?.name?.charAt(0) ?? '?'}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{reply.author?.name ?? 'Unknown'}</span>
        <span className="text-muted-foreground text-xs">{timeAgo}</span>
      </div>
      <div className="prose prose-sm mt-1 max-w-none">
        <TipTapRenderer content={reply.body} />
      </div>
      <ReactionSummary
        reactions={reply.reactions ?? []}
        currentUserId={currentUserId ?? undefined}
        onToggle={onReactionToggle}
      />
    </div>
  )
}

function TipTapRenderer({ content }: { content: unknown }) {
  if (!content) return <p className="text-muted-foreground italic">No content</p>

  const json = content as { type?: string; content?: Array<{ type?: string; text?: string; content?: unknown[]; attrs?: Record<string, unknown> }> }

  if (!json.content || json.content.length === 0) {
    return <p className="text-muted-foreground italic">No content</p>
  }

  return (
    <div>
      {json.content.map((node, i) => {
        if (node.type === 'paragraph') {
          const text = extractText(node)
          if (!text) return null
          return <p key={i} className="text-sm">{text}</p>
        }
        if (node.type === 'heading') {
          const text = extractText(node)
          if (!text) return null
          const level = (node.attrs as Record<string, unknown> | undefined)?.level as number | undefined
          const hLevel = level ?? 1
          if (hLevel === 1) return <h1 key={i} className="text-base font-semibold">{text}</h1>
          if (hLevel === 2) return <h2 key={i} className="text-base font-semibold">{text}</h2>
          return <h3 key={i} className="text-base font-semibold">{text}</h3>
        }
        if (node.type === 'bulletList') {
          return (
            <ul key={i} className="ml-4 list-disc text-sm">
              {node.content?.map((item, j) => (
                <li key={j}>{extractText(item)}</li>
              ))}
            </ul>
          )
        }
        if (node.type === 'orderedList') {
          return (
            <ol key={i} className="ml-4 list-decimal text-sm">
              {node.content?.map((item, j) => (
                <li key={j}>{extractText(item)}</li>
              ))}
            </ol>
          )
        }
        if (node.type === 'codeBlock') {
          const text = extractText(node)
          return (
            <pre key={i} className="bg-muted mt-1 rounded p-2 text-xs">
              <code>{text}</code>
            </pre>
          )
        }
        if (node.type === 'blockquote') {
          const text = extractText(node)
          return (
            <blockquote key={i} className="border-l-2 border-border pl-3 text-muted-foreground italic text-sm">
              {text}
            </blockquote>
          )
        }
        if (node.type === 'horizontalRule') {
          return <hr key={i} className="my-2 border-border" />
        }
        return null
      })}
    </div>
  )
}

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as { text?: string; content?: unknown[] }
  if (n.text) return n.text
  if (n.content) {
    return n.content
      .map((child) => extractText(child))
      .join('')
  }
  return ''
}
