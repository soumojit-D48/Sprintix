'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Search, X, Hash, Loader2, MessageSquare } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc/provider'
import { useChatStore } from '@/stores/chat-store'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export function MessageSearch() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const setSearchOpen = useChatStore((s) => s.setSearchOpen)

  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  const { data: searchResults, isLoading } = trpc.message.search.useQuery(
    { workspaceId: workspace?.id ?? '', query: debouncedQuery, limit: 20 },
    { enabled: !!workspace?.id && debouncedQuery.length >= 2 }
  )

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setTimeout(() => {
      setDebouncedQuery(value)
    }, 300)
  }

  return (
    <div className="bg-background/95 fixed inset-0 z-50 flex items-start justify-center pt-[15vh] backdrop-blur-sm">
      <div className="border-border mx-4 w-full max-w-2xl rounded-lg border shadow-xl">
        <div className="flex items-center border-b px-4">
          <Search className="text-muted-foreground size-4 shrink-0" />
          <Input
            placeholder="Search messages..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => setSearchOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto">
          {debouncedQuery.length < 2 ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              Type at least 2 characters to search
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : searchResults?.results.length === 0 ? (
            <div className="text-muted-foreground px-4 py-8 text-center text-sm">
              No messages found for &quot;{debouncedQuery}&quot;
            </div>
          ) : (
            <div className="space-y-0.5 p-2">
              {searchResults?.results.map((result: any) => (
                <Link
                  key={result.id}
                  href={`/${workspaceSlug}/chat/${result.channelId}`}
                  onClick={() => setSearchOpen(false)}
                  className={cn(
                    'hover:bg-muted flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors'
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Hash className="text-muted-foreground size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        #{result.channelName}
                      </span>
                      <span className="text-muted-foreground/50">&middot;</span>
                      <div className="flex items-center gap-1">
                        <Avatar className="size-4">
                          <AvatarImage
                            src={result.senderAvatarUrl ?? ''}
                            alt={result.senderName ?? ''}
                          />
                          <AvatarFallback className="text-[8px]">
                            {(result.senderName ?? 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground text-xs">{result.senderName}</span>
                      </div>
                      <span className="text-muted-foreground/50 text-xs">
                        {new Date(result.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-sm">
                      {result.bodyText?.replace(/<[^>]*>/g, '').substring(0, 200)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="text-muted-foreground border-t px-4 py-2 text-[11px]">
          <kbd className="bg-muted rounded px-1 py-0.5 text-[10px]">ESC</kbd> to close
        </div>
      </div>
    </div>
  )
}
