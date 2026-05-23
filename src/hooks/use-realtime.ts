import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { trpc } from '@/lib/trpc/provider'
import { useChatStore } from '@/stores/chat-store'
import { toast } from 'sonner'

export function useRealtime(workspaceId?: string) {
  const utils = trpc.useUtils()
  const addTypingUser = useChatStore((s) => s.addTypingUser)
  const removeTypingUser = useChatStore((s) => s.removeTypingUser)

  useEffect(() => {
    if (!workspaceId) return

    const pusher = getPusherClient()
    if (!pusher) return

    const channelName = `private-workspace-${workspaceId}`
    const channel = pusher.subscribe(channelName)

    channel.bind('pusher:subscription_error', (err: { status?: number; error?: string }) => {
      if (err.status === 403) {
        toast.error('Real-time access denied')
      }
    })

    channel.bind('pusher:subscription_succeeded', () => {
      console.log(`[Realtime] Subscribed to ${channelName}`)
    })

    // Listen for issue updates
    channel.bind('issue:updated', (data: { issueId: string; projectId: string }) => {
      utils.issue.getById.invalidate({ issueId: data.issueId })
      utils.issue.list.invalidate({ projectId: data.projectId })
      utils.issue.listBacklog.invalidate({ projectId: data.projectId })
      utils.issue.listForCurrentUser.invalidate({ workspaceId })
    })

    channel.bind('issue:created', (data: { issueId: string; projectId: string }) => {
      utils.issue.list.invalidate({ projectId: data.projectId })
      utils.issue.listBacklog.invalidate({ projectId: data.projectId })
      utils.project.getById.invalidate({ projectId: data.projectId })
    })

    channel.bind('issue:deleted', (data: { issueId: string; projectId: string }) => {
      utils.issue.list.invalidate({ projectId: data.projectId })
      utils.issue.listBacklog.invalidate({ projectId: data.projectId })
      utils.issue.listForCurrentUser.invalidate({ workspaceId })
      utils.project.getById.invalidate({ projectId: data.projectId })
    })

    // Listen for comment updates
    channel.bind('comment:created', (data: { issueId: string }) => {
      utils.comment.getActivityFeed.invalidate({ issueId: data.issueId })
      utils.issue.getById.invalidate({ issueId: data.issueId })
    })

    channel.bind('comment:deleted', (data: { issueId: string }) => {
      utils.comment.getActivityFeed.invalidate({ issueId: data.issueId })
      utils.issue.getById.invalidate({ issueId: data.issueId })
    })

    channel.bind('comment:reacted', (data: { issueId: string }) => {
      utils.comment.getActivityFeed.invalidate({ issueId: data.issueId })
    })

    channel.bind('comment:unreacted', (data: { issueId: string }) => {
      utils.comment.getActivityFeed.invalidate({ issueId: data.issueId })
    })

    // Listen for message updates
    channel.bind('message:created', (data: { channelId: string; messageId: string }) => {
      utils.message.list.invalidate({ channelId: data.channelId })
      utils.message.getThread.invalidate({ messageId: data.messageId })
    })

    channel.bind('message:updated', (data: { channelId: string; messageId: string }) => {
      utils.message.list.invalidate({ channelId: data.channelId })
      utils.message.getThread.invalidate({ messageId: data.messageId })
    })

    channel.bind('message:deleted', (data: { channelId: string; messageId: string }) => {
      utils.message.list.invalidate({ channelId: data.channelId })
      utils.message.getThread.invalidate({ messageId: data.messageId })
    })

    channel.bind('message:reacted', (data: { channelId: string; messageId: string }) => {
      utils.message.list.invalidate({ channelId: data.channelId })
      utils.message.getThread.invalidate({ messageId: data.messageId })
    })

    channel.bind('message:unreacted', (data: { channelId: string; messageId: string }) => {
      utils.message.list.invalidate({ channelId: data.channelId })
      utils.message.getThread.invalidate({ messageId: data.messageId })
    })

    channel.bind('message:thread-reply', (data: { channelId: string; messageId: string; parentId: string }) => {
      utils.message.getThread.invalidate({ messageId: data.parentId })
      utils.message.list.invalidate({ channelId: data.channelId })
    })

    // Listen for channel updates
    channel.bind('channel:created', (data: { channelId: string }) => {
      utils.channel.list.invalidate({ workspaceId })
    })

    channel.bind('channel:archived', (data: { channelId: string }) => {
      utils.channel.list.invalidate({ workspaceId })
    })

    // Listen for typing indicators (client events)
    channel.bind('client-typing:start', (data: { channelId: string; userId: string; name: string }) => {
      addTypingUser(data.channelId, data.userId, data.name || 'Someone')
      setTimeout(() => {
        removeTypingUser(data.channelId, data.userId)
      }, 3500)
    })

    channel.bind('client-typing:stop', (data: { channelId: string; userId: string }) => {
      removeTypingUser(data.channelId, data.userId)
    })

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [workspaceId, utils, addTypingUser, removeTypingUser])
}
