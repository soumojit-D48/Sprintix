'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface IssueSummarizerProps {
  issueId: string
}

export function IssueSummarizer({ issueId }: IssueSummarizerProps) {
  const [summary, setSummary] = useState<string[] | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const summarizeMutation = trpc.ai.summarizeIssue.useMutation({
    onSuccess: (data) => {
      setSummary(data.summary)
    },
    onError: (err) => {
      if (err.message === 'UPGRADE_REQUIRED') {
        toast.error('AI features are available on the Pro plan.')
      } else if (err.message === 'RATE_LIMIT_EXCEEDED') {
        toast.error('AI request limit reached for today. Try again tomorrow.')
      } else {
        toast.error(err.message)
      }
    },
  })

  function handleSummarize() {
    if (summary) {
      setCollapsed(!collapsed)
      return
    }
    summarizeMutation.mutate({ issueId })
  }

  return (
    <div className="rounded-lg border bg-purple-50/30">
      <button
        type="button"
        onClick={handleSummarize}
        className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-purple-50/50"
      >
        <Sparkles className="size-4 text-purple-600" />
        <span className="text-sm font-medium text-purple-700">
          {summary ? 'AI Summary' : 'Summarize with AI'}
        </span>
        {summarizeMutation.isPending && (
          <Loader2 className="ml-auto size-3.5 animate-spin text-purple-500" />
        )}
        {summary && !summarizeMutation.isPending && (
          <span className="ml-auto text-purple-500">
            {collapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
          </span>
        )}
      </button>

      {summarizeMutation.isPending && (
        <div className="space-y-2 px-4 pb-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-purple-200/50 h-4 animate-pulse rounded"
              style={{ width: `${60 + Math.random() * 30}%` }}
            />
          ))}
        </div>
      )}

      {summary && !collapsed && (
        <div className="space-y-1.5 px-4 pb-4">
          <ul className="space-y-1">
            {summary.map((point, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-2 text-sm">
                <span className="mt-1.5 block size-1.5 shrink-0 rounded-full bg-purple-400" />
                {point}
              </li>
            ))}
          </ul>
          <Badge variant="ghost" className="text-muted-foreground mt-1 text-[10px]">
            AI-generated
          </Badge>
        </div>
      )}
    </div>
  )
}
