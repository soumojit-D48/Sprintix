'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CalendarRange, CheckCircle2, Circle } from 'lucide-react'

interface SprintCardProps {
  id: string
  name: string
  status: string
  startDate: Date
  endDate: Date
  issueCount: number
  completedIssueCount: number
  completionRate: number
  workspaceSlug: string
  projectId: string
}

const statusStyles: Record<string, string> = {
  PLANNED: 'bg-blue-50 text-blue-700 border-blue-200',
  ACTIVE: 'bg-green-50 text-green-700 border-green-200',
  COMPLETED: 'bg-gray-50 text-gray-600 border-gray-200',
}

const statusIcons: Record<string, typeof Circle> = {
  PLANNED: Circle,
  ACTIVE: Circle,
  COMPLETED: CheckCircle2,
}

export function SprintCard({
  id,
  name,
  status,
  startDate,
  endDate,
  issueCount,
  completedIssueCount,
  completionRate,
  workspaceSlug,
  projectId,
}: SprintCardProps) {
  const StatusIcon = statusIcons[status] ?? Circle
  const isActive = status === 'ACTIVE'

  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`

  return (
    <Link
      href={`/${workspaceSlug}/projects/${projectId}/sprints/${id}`}
      className={cn(
        'group rounded-lg border p-4 transition-all hover:shadow-md',
        isActive ? 'border-green-300 bg-green-50/30' : ''
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={cn(
              'size-4',
              status === 'ACTIVE' ? 'text-green-600 fill-green-600' : 'text-muted-foreground'
            )}
          />
          <h3 className="font-semibold">{name}</h3>
          <Badge variant="outline" className={cn('text-xs', statusStyles[status] ?? '')}>
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </Badge>
        </div>
        <span className="text-muted-foreground text-sm">{completionRate}%</span>
      </div>

      <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <CalendarRange className="size-3.5" />
          {dateRange}
        </div>
        <span>
          {completedIssueCount}/{issueCount} done
        </span>
      </div>

      <Progress value={completionRate} className="mt-3 h-1.5" />
    </Link>
  )
}
