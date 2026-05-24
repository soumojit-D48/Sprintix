'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useParams } from 'next/navigation'
import { useInView } from 'framer-motion'
import { Loader2, ChevronDown } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'
import { useChatStore } from '@/stores/chat-store'

interface MessageAreaProps {
  channelId: string
  currentUserId: string
}

function groupMessages(messages: any[]) {
  const groups: { messages: typeof messages; sender: any }[] = []
  const FIVE_MIN = 5 * 60 * 1000

  for (const msg of messages) {
    const lastGroup = groups[groups.length - 1]
    if (lastGroup) {
      const lastMsg = lastGroup.messages[lastGroup.messages.length - 1]
      const timeDiff = new Date(msg.createdAt).getTime() - new Date(lastMsg.createdAt).getTime()
      if (lastMsg.sender.id === msg.sender.id && timeDiff < FIVE_MIN) {
        lastGroup.messages.push(msg)
        continue
      }
    }
    groups.push({ messages: [msg], sender: msg.sender })
  }

  return groups
}

function formatDate(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const dayMs = 24 * 60 * 60 * 1000

  if (diff < dayMs && date.getDate() === now.getDate()) {
    return 'Today'
  }
  if (diff < 2 * dayMs && date.getDate() === now.getDate() - 1) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getDateDividers(messages: any[]) {
  const dividers: Set<string> = new Set()
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    dividers.add(dateKey)
  }
  return dividers
}

export function MessageArea({ channelId, currentUserId }: MessageAreaProps) {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const [atBottom, setAtBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isInitialLoad = useRef(true)
  const prevMessageCount = useRef(0)
  const markChannelRead = useChatStore((s) => s.markChannelRead)

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.message.list.useInfiniteQuery(
      { channelId, limit: 50 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    )

  const allMessages = data?.pages.flatMap((page) => page.messages) ?? []

  const isNearBottom = useCallback(() => {
    if (!scrollRef.current) return true
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    return scrollHeight - scrollTop - clientHeight < 200
  }, [])

  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setAtBottom(isNearBottom())

    if (el.scrollTop < 100 && hasNextPage && !isFetchingNextPage) {
      const prevHeight = el.scrollHeight
      fetchNextPage().then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight
        })
      })
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isNearBottom])

  useEffect(() => {
    if (isInitialLoad.current && allMessages.length > 0) {
      isInitialLoad.current = false
      scrollToBottom(false)
    }
  }, [allMessages.length, scrollToBottom])

  useEffect(() => {
    if (!isInitialLoad.current && allMessages.length > prevMessageCount.current && isNearBottom()) {
      scrollToBottom()
    }
    prevMessageCount.current = allMessages.length
  }, [allMessages.length, isNearBottom, scrollToBottom])

  useEffect(() => {
    isInitialLoad.current = true
    prevMessageCount.current = 0
    scrollRef.current?.scrollTo({ top: 0 })
  }, [channelId])

  useEffect(() => {
    if (atBottom && channelId) {
      markChannelRead(channelId)
    }
  }, [atBottom, channelId, markChannelRead])

  const groups = groupMessages(allMessages)
  const dateDividers = getDateDividers(allMessages)

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasNextPage && !isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNextPage()}
              className="text-muted-foreground text-xs"
            >
              Load older messages
            </Button>
          </div>
        )}

        {allMessages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <p className="text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}

        {groups.map((group, groupIdx) => {
          const firstMessage = group.messages[0]
          const dateKey = new Date(firstMessage.createdAt).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
          const showDateDivider = groupIdx === 0 || dateDividers.has(dateKey)

          return (
            <div key={firstMessage.id}>
              {showDateDivider && (
                <div className="relative my-4 flex items-center">
                  <div className="border-border flex-1 border-t" />
                  <span className="text-muted-foreground mx-3 shrink-0 text-xs font-medium">
                    {formatDate(new Date(firstMessage.createdAt))}
                  </span>
                  <div className="border-border flex-1 border-t" />
                </div>
              )}
              {group.messages.map((msg, msgIdx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isFirstInGroup={msgIdx === 0}
                  isLastInGroup={msgIdx === group.messages.length - 1}
                  workspaceSlug={workspaceSlug}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )
        })}

        <div ref={bottomRef} />
        <TypingIndicator channelId={channelId} />
      </div>

      {!atBottom && (
        <div className="absolute right-6 bottom-2">
          <Button
            variant="secondary"
            size="icon"
            className="shadow-md size-8 rounded-full"
            onClick={() => scrollToBottom()}
          >
            <ChevronDown className="size-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
