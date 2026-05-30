'use client'

import { useEffect, useRef } from 'react'
import { Sparkles, Loader2, X } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface LabelSuggestionProps {
  workspaceId: string
  issueTitle: string
  issueDescription: unknown
  onToggle: (labelId: string) => void
  selectedIds: string[]
}

export function LabelSuggestion({
  workspaceId,
  issueTitle,
  issueDescription,
  onToggle,
  selectedIds,
}: LabelSuggestionProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const suggestLabels = trpc.ai.suggestLabels.useMutation({
    onError: (err) => {
      if (err.message !== 'UPGRADE_REQUIRED' && err.message !== 'RATE_LIMIT_EXCEEDED') {
        toast.error(err.message)
      }
    },
  })

  const { data: labelsData } = trpc.label.list.useQuery({ workspaceId }, { enabled: !!workspaceId })

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!issueTitle.trim()) return

    debounceRef.current = setTimeout(() => {
      if (issueTitle.trim().length >= 3) {
        suggestLabels.mutate({
          workspaceId,
          issueTitle: issueTitle.trim(),
          issueDescription,
        })
      }
    }, 2000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTitle, issueDescription, workspaceId])

  if (!suggestLabels.data || suggestLabels.data.suggestedLabelIds.length === 0) {
    return null
  }

  const suggestedLabels = (labelsData ?? []).filter((l) =>
    suggestLabels.data?.suggestedLabelIds.includes(l.id)
  ).filter((l) => !selectedIds.includes(l.id))

  if (suggestedLabels.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="size-3 text-purple-600" />
        <span className="text-[10px] font-medium text-purple-700 uppercase tracking-wider">
          Suggested Labels
        </span>
        {suggestLabels.isPending && (
          <Loader2 className="size-2.5 animate-spin text-purple-400" />
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {suggestedLabels.map((label) => (
          <button
            key={label.id}
            type="button"
            onClick={() => onToggle(label.id)}
            className="group relative"
          >
            <Badge
              variant="outline"
              className="cursor-pointer pr-6 text-[10px] transition-all hover:opacity-80"
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
                borderColor: label.color + '40',
              }}
            >
              {label.name}
              <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                <X className="size-2.5" />
              </span>
            </Badge>
          </button>
        ))}
      </div>
    </div>
  )
}
