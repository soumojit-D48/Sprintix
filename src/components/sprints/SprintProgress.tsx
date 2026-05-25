'use client'

import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface SprintProgressProps {
  completedIssues: number
  totalIssues: number
  className?: string
}

export function SprintProgress({
  completedIssues,
  totalIssues,
  className,
}: SprintProgressProps) {
  const percentage = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {completedIssues} of {totalIssues} issues completed
        </span>
        <span className={cn('font-medium', percentage === 100 ? 'text-green-600' : '')}>
          {percentage}%
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  )
}
