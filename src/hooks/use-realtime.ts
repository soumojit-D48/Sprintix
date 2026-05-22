import { useEffect } from 'react'
import { getPusherClient } from '@/lib/pusher-client'
import { trpc } from '@/lib/trpc/provider'
import { toast } from 'sonner'

export function useRealtime(workspaceId?: string) {
  const utils = trpc.useUtils()

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
      // Invalidate specific issue
      utils.issue.getById.invalidate({ issueId: data.issueId })
      // Invalidate project issue lists
      utils.issue.list.invalidate({ projectId: data.projectId })
      utils.issue.listBacklog.invalidate({ projectId: data.projectId })
      // Invalidate user's personal issues
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

    return () => {
      channel.unbind_all()
      pusher.unsubscribe(channelName)
    }
  }, [workspaceId, utils])
}
