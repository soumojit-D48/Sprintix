'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Hash, Lock, Plus, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { trpc } from '@/lib/trpc/provider'
import { useChatStore } from '@/stores/chat-store'
import { ChannelCreateDialog } from './ChannelCreateDialog'
import { DmCreateDialog } from './DmCreateDialog'

interface ChannelListProps {
  workspaceId: string
  workspaceSlug: string
}

export function ChannelList({ workspaceId, workspaceSlug }: ChannelListProps) {
  const pathname = usePathname()
  const [channelsOpen, setChannelsOpen] = useState(true)
  const [dmsOpen, setDmsOpen] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [dmCreateOpen, setDmCreateOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const setSearchOpen = useChatStore((s) => s.setSearchOpen)

  const { data: channels } = trpc.channel.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  )

  const { data: dms } = trpc.channel.listDms.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  )

  const filteredChannels = channels?.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDms = dms?.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isActive = (id: string) => pathname.includes(`/chat/${id}`)

  return (
    <aside className="bg-muted/30 flex w-60 shrink-0 flex-col border-r">
      <div className="flex items-center gap-2 border-b p-3">
        <Search className="text-muted-foreground size-4 shrink-0" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
          >
            <Search className="size-4" />
            <span>Search messages</span>
          </button>
        </div>

        <div className="px-2">
          <div className="flex items-center justify-between py-1">
            <button
              onClick={() => setChannelsOpen(!channelsOpen)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold uppercase"
            >
              <span>{channelsOpen ? '▾' : '▸'}</span>
              <span>Channels</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          {channelsOpen && (
            <div className="space-y-0.5 pb-2">
              {(searchQuery ? filteredChannels : channels)?.map((channel) => (
                <Link
                  key={channel.id}
                  href={`/${workspaceSlug}/chat/${channel.id}`}
                  className={cn(
                    'hover:bg-muted flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors',
                    isActive(channel.id) && 'bg-muted font-medium'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {channel.type === 'PRIVATE' ? (
                      <Lock className="text-muted-foreground size-3.5 shrink-0" />
                    ) : (
                      <Hash className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <span className="truncate">{channel.name}</span>
                  </div>
                  {(unreadCounts[channel.id] ?? channel.unreadCount ?? 0) > 0 && (
                    <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                      {unreadCounts[channel.id] ?? channel.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
              {(searchQuery ? filteredChannels : channels)?.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-xs">
                  {searchQuery ? 'No channels found' : 'No channels yet'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-2">
          <div className="flex items-center justify-between py-1">
            <button
              onClick={() => setDmsOpen(!dmsOpen)}
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-semibold uppercase"
            >
              <span>{dmsOpen ? '▾' : '▸'}</span>
              <span>Direct Messages</span>
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="size-5"
              onClick={() => setDmCreateOpen(true)}
            >
              <Plus className="size-3" />
            </Button>
          </div>

          {dmsOpen && (
            <div className="space-y-0.5 pb-2">
              {(searchQuery ? filteredDms : dms)?.map((dm) => (
                <Link
                  key={dm.id}
                  href={`/${workspaceSlug}/chat/${dm.id}`}
                  className={cn(
                    'hover:bg-muted flex items-center justify-between rounded-md px-2 py-1 text-sm transition-colors',
                    isActive(dm.id) && 'bg-muted font-medium'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <User className="text-muted-foreground size-3.5 shrink-0" />
                    <span className="truncate">{dm.name}</span>
                  </div>
                  {(unreadCounts[dm.id] ?? dm.unreadCount ?? 0) > 0 && (
                    <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium">
                      {unreadCounts[dm.id] ?? dm.unreadCount}
                    </span>
                  )}
                </Link>
              ))}
              {(searchQuery ? filteredDms : dms)?.length === 0 && (
                <p className="text-muted-foreground px-2 py-1 text-xs">
                  {searchQuery ? 'No DMs found' : 'No direct messages yet'}
                </p>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <ChannelCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
      />
      <DmCreateDialog
        open={dmCreateOpen}
        onOpenChange={setDmCreateOpen}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
      />
    </aside>
  )
}
