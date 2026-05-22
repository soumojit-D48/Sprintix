'use client'

import { useState, useMemo } from 'react'
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

type FeedItem = {
  type: 'comment' | 'activity'
  id: string
  createdAt: Date
  [key: string]: unknown
}

type CommentNode = FeedItem & {
  type: 'comment'
  author: { id: string; name: string; avatarUrl: string | null; email: string }
  body: unknown
  parentId: string | null
  reactions: { id: string; emoji: string; userId: string }[]
  children: CommentNode[]
}

interface IssueActivityFeedProps {
  issueId: string
  workspaceId?: string
  currentUserId: string | undefined
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
  const [replyBody, setReplyBody] = useState<unknown>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState<unknown>(null)
  const [newComment, setNewComment] = useState<unknown>(null)

  const commentTree = useMemo(() => {
    if (!feed) return { roots: [], commentMap: {} }

    const commentMap = new Map<string, CommentNode>()
    const roots: CommentNode[] = []

    for (const item of feed) {
      if (item.type !== 'comment') continue
      const c = item as any
      const node: CommentNode = {
        type: 'comment',
        id: c.id,
        author: c.author,
        body: c.body,
        createdAt: c.createdAt,
        parentId: c.parentId,
        reactions: c.reactions ?? [],
        children: [],
      }
      commentMap.set(c.id, node)
    }

    for (const node of commentMap.values()) {
      if (node.parentId && commentMap.has(node.parentId)) {
        commentMap.get(node.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return { roots, commentMap: Object.fromEntries(commentMap) }
  }, [feed])

  const mergedFeed = useMemo(() => {
    if (!feed) return []

    const activityItems = feed.filter((item) => item.type === 'activity')
    const rootComments = commentTree.roots

    const merged: FeedItem[] = [...activityItems, ...rootComments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    return merged
  }, [feed, commentTree])

  const memberList = (members ?? []).map((m: any) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
  }))

  const userMap = Object.fromEntries(
    (members ?? []).map((m: any) => [
      m.user.id,
      { name: m.user.name, avatarUrl: m.user.avatarUrl },
    ])
  )

  function handleReactionToggle(commentId: string, emoji: string) {
    const node = commentTree.commentMap[commentId]
    if (!node) return
    const alreadyReacted = node.reactions.some((r) => r.userId === currentUserId && r.emoji === emoji)
    if (alreadyReacted) {
      unreact.mutate({ commentId, emoji })
    } else {
      react.mutate({ commentId, emoji })
    }
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

  function handleReplySubmit(parentId: string) {
    if (!replyBody) return
    createComment.mutate(
      { issueId, body: replyBody as Record<string, unknown>, parentId },
      {
        onSuccess: () => {
          setReplyTo(null)
          setReplyBody(null)
        },
      }
    )
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
      {mergedFeed.map((item) => {
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

        if (item.type !== 'comment') return null

        return (
          <CommentThread
            key={item.id}
            node={item as CommentNode}
            currentUserId={currentUserId}
            issueId={issueId}
            members={memberList}
            editingId={editingId}
            editBody={editBody}
            replyTo={replyTo}
            replyBody={replyBody}
            setEditingId={setEditingId}
            setEditBody={setEditBody}
            setReplyTo={setReplyTo}
            setReplyBody={setReplyBody}
            handleSaveEdit={handleSaveEdit}
            handleReplySubmit={handleReplySubmit}
            handleReactionToggle={handleReactionToggle}
            deleteComment={deleteComment}
            updateComment={updateComment}
            userMap={userMap}
          />
        )
      })}

      <div className="mt-4 flex items-start gap-3 pt-4 border-t">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="text-xs">Y</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <CommentEditor
            content={newComment}
            onChange={setNewComment}
            placeholder="Add a comment..."
            members={memberList}
          />
          <Button
            size="sm"
            disabled={!newComment}
            onClick={() => {
              createComment.mutate(
                { issueId, body: newComment as Record<string, unknown> },
                { onSuccess: () => setNewComment(null) }
              )
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

function CommentThread({
  node,
  currentUserId,
  issueId,
  members,
  editingId,
  editBody,
  replyTo,
  replyBody,
  setEditingId,
  setEditBody,
  setReplyTo,
  setReplyBody,
  handleSaveEdit,
  handleReplySubmit,
  handleReactionToggle,
  deleteComment,
  updateComment,
  depth = 0,
  userMap,
}: {
  node: CommentNode
  currentUserId: string | undefined
  issueId: string
  members: { id: string; name: string; avatarUrl: string | null }[]
  editingId: string | null
  editBody: unknown
  replyTo: string | null
  replyBody: unknown
  setEditingId: (id: string | null) => void
  setEditBody: (body: unknown) => void
  setReplyTo: (id: string | null) => void
  setReplyBody: (body: unknown) => void
  handleSaveEdit: () => void
  handleReplySubmit: (parentId: string) => void
  handleReactionToggle: (commentId: string, emoji: string) => void
  deleteComment: any
  updateComment: any
  depth?: number
  userMap: Record<string, { name: string; avatarUrl?: string | null }> | undefined
}) {
  const isOwn = node.author?.id === currentUserId
  const timeAgo = formatDistanceToNow(new Date(node.createdAt), { addSuffix: true })
  const isEditing = editingId === node.id
  const isReplying = replyTo === node.id

  return (
    <div className={cn(depth > 0 && 'border-l-[1.5px] border-border/50 pl-3')}>
      <div className="group flex items-start gap-3 py-3">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={node.author?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-xs">
            {node.author?.name?.charAt(0) ?? '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{node.author?.name ?? 'Unknown'}</span>
            <span className="text-muted-foreground text-xs">{timeAgo}</span>
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
                  <DropdownMenuItem onClick={() => { setEditBody(node.body); setEditingId(node.id) }}>
                    <Pencil className="mr-2 size-3.5" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteComment.mutate({ commentId: node.id })}
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
                content={editBody ?? node.body}
                onChange={setEditBody}
                placeholder="Edit comment..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} disabled={!editBody}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setEditingId(null); setEditBody(null) }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm mt-1 max-w-none">
              <TipTapRenderer content={node.body} />
            </div>
          )}

          <ReactionSummary
            reactions={node.reactions}
            currentUserId={currentUserId ?? undefined}
            onToggle={(emoji) => handleReactionToggle(node.id, emoji)}
            userMap={userMap}
          />

          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
              onClick={() => {
                if (isReplying) {
                  setReplyTo(null)
                  setReplyBody(null)
                } else {
                  setReplyTo(node.id)
                  setReplyBody(null)
                }
              }}
            >
              <Reply className="size-3" />
              Reply
            </button>
            <EmojiPicker
              onSelect={(emoji) => handleReactionToggle(node.id, emoji)}
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

          {isReplying && (
            <div className="mt-2 space-y-2">
              <CommentEditor
                content={replyBody}
                onChange={setReplyBody}
                placeholder="Write a reply..."
                members={members}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={!replyBody}
                  onClick={() => handleReplySubmit(node.id)}
                >
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setReplyTo(null); setReplyBody(null) }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {node.children.length > 0 && (
            <div className="mt-1">
              {node.children.map((child) => (
                <CommentThread
                  key={child.id}
                  node={child}
                  currentUserId={currentUserId}
                  issueId={issueId}
                  members={members}
                  editingId={editingId}
                  editBody={editBody}
                  replyTo={replyTo}
                  replyBody={replyBody}
                  setEditingId={setEditingId}
                  setEditBody={setEditBody}
                  setReplyTo={setReplyTo}
                  setReplyBody={setReplyBody}
                  handleSaveEdit={handleSaveEdit}
                  handleReplySubmit={handleReplySubmit}
                  handleReactionToggle={handleReactionToggle}
                  deleteComment={deleteComment}
                  updateComment={updateComment}
                  depth={depth + 1}
                  userMap={userMap}
                />
              ))}
            </div>
          )}
        </div>
      </div>
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
