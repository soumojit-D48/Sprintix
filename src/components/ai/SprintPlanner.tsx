'use client'

import { useState } from 'react'
import {
  Sparkles,
  Check,
  X,
  Lightbulb,
  Layers,
  Gauge,
  MessageSquareText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import { cn } from '@/lib/utils'

interface SprintPlannerProps {
  projectId: string
  workspaceSlug: string
  data: {
    recommendedIssueIds: string[]
    reasoning: string
    themes: {
      name: string
      issueIds: string[]
      estimatedComplexity: string
    }[]
    estimatedVelocity: number
  }
  isPending: boolean
  onAcceptSuggestion: (issueIds: string[]) => void
  onReject: () => void
  backlogIssues: {
    id: string
    identifier: string
    title: string
    priority: string
    assignee?: { name: string | null } | null
  }[]
}

export function SprintPlanner({
  projectId,
  workspaceSlug,
  data,
  isPending,
  onAcceptSuggestion,
  onReject,
  backlogIssues,
}: SprintPlannerProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(data.recommendedIssueIds))

  function toggleIssue(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleAccept() {
    onAcceptSuggestion(Array.from(selectedIds))
    setSelectedIds(new Set())
  }

  function handleReject() {
    onReject()
    setSelectedIds(new Set())
  }

  const issueMap = new Map(backlogIssues.map((i) => [i.id, i]))

  const priorityColor: Record<string, string> = {
    URGENT: 'text-red-500',
    HIGH: 'text-orange-500',
    MEDIUM: 'text-yellow-500',
    LOW: 'text-blue-500',
    NO_PRIORITY: 'text-muted-foreground',
  }

  return (
    <div className="shrink-0 px-6 py-3 border-b">
      <div className="overflow-hidden rounded-lg border bg-purple-50/30 dark:bg-purple-950/10">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">AI Sprint Recommendation</span>
            <Badge variant="outline" className="border-purple-200 text-[10px] text-purple-600">
              {data.recommendedIssueIds.length} issues
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-purple-700 hover:bg-purple-100"
              onClick={handleAccept}
            >
              <Check className="mr-1 size-3" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground hover:bg-purple-100"
              onClick={handleReject}
            >
              <X className="mr-1 size-3" />
              Reject
            </Button>
          </div>
        </div>

        {/* Reasoning */}
        {data.reasoning && (
          <div className="flex items-start gap-2 border-b px-4 py-2.5">
            <MessageSquareText className="mt-0.5 size-3.5 shrink-0 text-purple-500" />
            <p className="text-muted-foreground text-xs leading-relaxed">
              {data.reasoning}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 border-b px-4 py-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Gauge className="size-3.5 text-purple-500" />
            Est. velocity: {data.estimatedVelocity}
          </div>
          {data.themes.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="size-3.5 text-purple-500" />
              {data.themes.length} themes
            </div>
          )}
        </div>

        {/* Themes */}
        <div className="max-h-80 overflow-y-auto">
          {data.themes.map((theme, ti) => (
            <div key={ti}>
              {ti > 0 && <Separator />}
              <div className="px-4 py-2.5">
                <div className="mb-2 flex items-center gap-1.5">
                  <Lightbulb className="size-3 text-purple-500" />
                  <span className="text-xs font-medium">{theme.name}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px]',
                      theme.estimatedComplexity === 'high'
                        ? 'border-red-200 text-red-600'
                        : theme.estimatedComplexity === 'medium'
                          ? 'border-yellow-200 text-yellow-600'
                          : 'border-green-200 text-green-600'
                    )}
                  >
                    {theme.estimatedComplexity}
                  </Badge>
                </div>
                <div className="space-y-1">
                  {theme.issueIds.map((issueId) => {
                    const issue = issueMap.get(issueId)
                    if (!issue) return null
                    const isSelected = selectedIds.has(issueId)

                    return (
                      <button
                        key={issueId}
                        type="button"
                        onClick={() => toggleIssue(issueId)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors',
                          isSelected
                            ? 'bg-purple-100 text-purple-900'
                            : 'text-muted-foreground hover:bg-purple-50/50'
                        )}
                      >
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-sm border transition-colors',
                            isSelected
                              ? 'border-purple-500 bg-purple-500 text-white'
                              : 'border-muted-foreground/30'
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span className={cn('shrink-0 font-mono text-[10px]', priorityColor[issue.priority])}>
                          {issue.identifier}
                        </span>
                        <span className="flex-1 truncate">{issue.title}</span>
                        {issue.assignee && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {issue.assignee.name}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between border-t bg-white px-4 py-2.5 dark:bg-card">
          <span className="text-xs text-muted-foreground">
            {selectedIds.size} of {data.recommendedIssueIds.length} issues selected
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={handleReject}
            >
              <X className="mr-1 size-3" />
              Discard
            </Button>
            <Button
              size="sm"
              className="h-7 bg-purple-600 text-xs text-white hover:bg-purple-700"
              onClick={handleAccept}
              disabled={selectedIds.size === 0}
            >
              <Check className="mr-1 size-3" />
              Add {selectedIds.size} to sprint
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
