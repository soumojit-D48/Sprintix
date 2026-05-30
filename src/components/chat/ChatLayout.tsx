'use client'

import { useChatStore } from '@/stores/chat-store'
import { ChannelList } from './ChannelList'
import { MessageArea } from './MessageArea'
import { MessageInput } from './MessageInput'
import { MessageThread } from './MessageThread'
import { MessageSearch } from './MessageSearch'
import { useParams } from 'next/navigation'
import { Hash, MessageSquare, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { trpc } from '@/lib/trpc/provider'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export function ChatLayout({ currentUserId }: { currentUserId: string }) {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const channelId = params.channelId as string | undefined
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const activeChannelId = useChatStore((s) => s.activeChannelId)
  const threadMessageId = useChatStore((s) => s.threadMessageId)
  const searchOpen = useChatStore((s) => s.searchOpen)
  const setActiveChannel = useChatStore((s) => s.setActiveChannel)

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  useEffect(() => {
    if (channelId) {
      setActiveChannel(channelId)
    }
  }, [channelId, setActiveChannel])

  const { data: channel } = trpc.channel.getById.useQuery(
    { channelId: activeChannelId ?? '' },
    { enabled: !!activeChannelId }
  )

  if (!workspace) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading workspace...</div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <div className={cn('hidden md:block', channel ? 'max-md:hidden' : '')}>
        <ChannelList workspaceId={workspace.id} workspaceSlug={workspaceSlug} />
      </div>

      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden',
          !channel && 'max-md:hidden'
        )}
      >
        {channel ? (
          <>
            <div className="bg-background flex items-center gap-2 border-b px-3 py-3 md:px-4">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 md:hidden"
                onClick={() => setMobileSidebarOpen(true)}
              >
                <Menu className="size-4" />
              </Button>
              <Hash className="text-muted-foreground size-4 shrink-0" />
              <span className="font-semibold truncate">{channel.name}</span>
              {channel.description && (
                <span className="text-muted-foreground hidden truncate text-sm md:inline">
                  &mdash; {channel.description}
                </span>
              )}
            </div>
            <MessageArea channelId={channel.id} currentUserId={currentUserId} />
            <MessageInput channelId={channel.id} workspaceId={workspace.id} channelType={channel.type} currentUserId={currentUserId} />
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <MessageSquare className="text-muted-foreground/40 size-12" />
            <p className="text-muted-foreground text-sm">Select a channel to start chatting</p>
          </div>
        )}
      </div>

      {threadMessageId && (
        <div className={cn('hidden border-l md:block', 'w-96')}>
          <MessageThread />
        </div>
      )}

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="bg-background/80 backdrop-blur-sm absolute inset-0" onClick={() => setMobileSidebarOpen(false)} />
          <div className="bg-background relative h-full w-72 shadow-lg">
            <ChannelList workspaceId={workspace.id} workspaceSlug={workspaceSlug} />
          </div>
        </div>
      )}

      {searchOpen && <MessageSearch />}
    </div>
  )
}
