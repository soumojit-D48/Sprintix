'use client'

import { Sparkles, Loader2, UserCheck } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface AssigneeSuggestionProps {
  projectId: string
  title: string
  description: unknown
  onSelect: (userId: string) => void
  currentAssigneeId: string | null
  members: { user: { id: string; name: string | null; avatarUrl: string | null } }[]
}

export function AssigneeSuggestion({
  projectId,
  title,
  description,
  onSelect,
  currentAssigneeId,
  members,
}: AssigneeSuggestionProps) {
  const suggestMutation = trpc.ai.suggestAssignee.useMutation({
    onError: (err) => {
      if (err.message === 'UPGRADE_REQUIRED') {
        toast.error('AI suggestions are available on the Pro plan.')
      } else if (err.message !== 'RATE_LIMIT_EXCEEDED') {
        toast.error(err.message)
      }
    },
  })

  function handleSuggest() {
    if (suggestMutation.data) return
    suggestMutation.mutate({ projectId, issueTitle: title, issueDescription: description })
  }

  const memberMap = new Map(members.map((m) => [m.user.id, m.user]))

  return (
    <div className="space-y-2">
      {!suggestMutation.data && !suggestMutation.isPending && (
        <button
          type="button"
          onClick={handleSuggest}
          disabled={!title.trim()}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs transition-colors disabled:opacity-50"
        >
          <Sparkles className="size-3" />
          Suggest assignee
        </button>
      )}

      {suggestMutation.isPending && (
        <div className="flex items-center gap-2 text-xs text-purple-600">
          <Loader2 className="size-3 animate-spin" />
          Analyzing team workload...
        </div>
      )}

      {suggestMutation.data && suggestMutation.data.suggestions.length > 0 && (
        <div className="rounded-md border bg-purple-50/30 p-2">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-purple-700 uppercase tracking-wider">
            <Sparkles className="size-3" />
            Suggested Assignees
          </div>
          <div className="space-y-1">
            {suggestMutation.data.suggestions.map((suggestion, i) => {
              const member = memberMap.get(suggestion.userId ?? '')
              const isSelected = currentAssigneeId === suggestion.userId

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (suggestion.userId) onSelect(suggestion.userId)
                  }}
                  disabled={!suggestion.userId}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    isSelected
                      ? 'bg-purple-100 text-purple-900'
                      : 'hover:bg-purple-100/50 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {member ? (
                    <Avatar className="size-5">
                      <AvatarImage src={member.avatarUrl ?? ''} />
                      <AvatarFallback className="text-[8px]">
                        {member.name?.charAt(0) ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="bg-muted size-5 rounded-full" />
                  )}
                  <div className="flex-1 truncate">
                    <span className="font-medium">{suggestion.name}</span>
                  </div>
                  {isSelected && <UserCheck className="size-3 text-purple-600" />}
                </button>
              )
            })}
          </div>
          <p className="text-muted-foreground mt-1 text-[10px] leading-relaxed">
            {suggestMutation.data.suggestions[0]?.reasoning}
          </p>
        </div>
      )}

      {suggestMutation.data?.suggestions.length === 0 && (
        <p className="text-muted-foreground text-xs">
          No suitable assignees found. Try adding more team members.
        </p>
      )}
    </div>
  )
}
