'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarRange,
  Circle,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'text-gray-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-yellow-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-red-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'text-red-500',
  HIGH: 'text-orange-500',
  MEDIUM: 'text-yellow-500',
  LOW: 'text-blue-500',
  NO_PRIORITY: 'text-muted-foreground',
}

type ZoomLevel = 'week' | 'month' | 'quarter'

function getDateGroupLabel(date: Date, zoom: ZoomLevel): string {
  if (zoom === 'week') {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }
  if (zoom === 'month') {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }
  // quarter → group by month
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function getGroupKey(date: Date, zoom: ZoomLevel): string {
  if (zoom === 'week') return date.toDateString()
  if (zoom === 'month') {
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    return weekStart.toISOString().split('T')[0] ?? ''
  }
  return `${date.getFullYear()}-${date.getMonth()}`
}

export default function TimelinePage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  const [zoom, setZoom] = useState<ZoomLevel>('month')
  const [createOpen, setCreateOpen] = useState(false)
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)

  const { data: project } = trpc.project.getById.useQuery({ projectId })
  const { data: issueData, isLoading } = trpc.issue.list.useQuery({
    projectId,
    limit: 500,
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  const issues = issueData?.issues ?? []
  const now = new Date()
  const todayStr = now.toDateString()

  // Split into scheduled (has due date) and unscheduled
  const scheduled = issues.filter((i) => !!i.dueDate && !['DONE', 'CANCELLED'].includes(i.status))
  const unscheduled = issues.filter((i) => !i.dueDate && !['DONE', 'CANCELLED'].includes(i.status))
  const done = issues.filter((i) => ['DONE', 'CANCELLED'].includes(i.status))

  // Group scheduled issues by date bucket
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; date: Date; issues: typeof scheduled }>()
    for (const issue of scheduled) {
      const d = new Date(issue.dueDate!)
      const key = getGroupKey(d, zoom)
      if (!map.has(key)) {
        map.set(key, { label: getDateGroupLabel(d, zoom), date: d, issues: [] })
      }
      map.get(key)!.issues.push(issue)
    }
    // Sort by date
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [scheduled, zoom])

  const overdue = scheduled.filter((i) => new Date(i.dueDate!) < now)
  const upcoming = scheduled.filter((i) => new Date(i.dueDate!) >= now)

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <CalendarRange className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Timeline</span>
          <div className="flex items-center gap-1">
            {overdue.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdue.length} overdue
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {upcoming.length} upcoming
            </Badge>
            <Badge variant="outline" className="text-xs">
              {unscheduled.length} unscheduled
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex overflow-hidden rounded-md border">
            {(['week', 'month', 'quarter'] as ZoomLevel[]).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                  zoom === z
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {z}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 size-4" />
            Create Issue
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4 p-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-5 w-48" />
              <div className="space-y-1.5">
                {Array.from({ length: 3 }).map((_, j) => (
                  <Skeleton key={j} className="h-11 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="mx-auto max-w-4xl px-6 py-6 space-y-8">

            {/* Overdue section */}
            {overdue.length > 0 && (
              <Section
                icon={<AlertCircle className="size-4 text-destructive" />}
                title="Overdue"
                titleClass="text-destructive"
                count={overdue.length}
              >
                {overdue.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    now={now}
                    todayStr={todayStr}
                    onClick={() => setSlideOverIssueId(issue.id)}
                  />
                ))}
              </Section>
            )}

            {/* Date-grouped upcoming issues */}
            {grouped.length > 0 ? (
              grouped.map((group) => (
                <Section
                  key={group.label}
                  icon={<CalendarRange className="text-muted-foreground size-4" />}
                  title={group.label}
                  count={group.issues.length}
                >
                  {group.issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      now={now}
                      todayStr={todayStr}
                      onClick={() => setSlideOverIssueId(issue.id)}
                    />
                  ))}
                </Section>
              ))
            ) : overdue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarRange className="text-muted-foreground/30 mb-4 size-14" />
                <h3 className="text-base font-semibold">No scheduled issues</h3>
                <p className="text-muted-foreground mt-1 text-sm">
                  Issues with due dates will appear here on a timeline.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="mr-1.5 size-4" />
                  Create Issue with Due Date
                </Button>
              </div>
            ) : null}

            {/* Unscheduled section */}
            {unscheduled.length > 0 && (
              <Section
                icon={<Clock className="text-muted-foreground size-4" />}
                title="Unscheduled"
                subtitle="No due date set"
                count={unscheduled.length}
              >
                {unscheduled.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    now={now}
                    todayStr={todayStr}
                    onClick={() => setSlideOverIssueId(issue.id)}
                  />
                ))}
              </Section>
            )}

            {/* Done section (collapsed summary) */}
            {done.length > 0 && (
              <div className="border-border rounded-lg border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Circle className="size-2.5 fill-current text-green-500" />
                  <span className="text-muted-foreground text-sm">
                    {done.filter((i) => i.status === 'DONE').length} done ·{' '}
                    {done.filter((i) => i.status === 'CANCELLED').length} cancelled
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {project && (
        <>
          <IssueCreateModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={projectId}
            workspaceId={project.workspaceId}
            workspaceSlug={workspaceSlug}
          />
          <IssueSlideOver
            open={!!slideOverIssueId}
            onOpenChange={(open) => {
              if (!open) setSlideOverIssueId(null)
            }}
            issueId={slideOverIssueId ?? ''}
            workspaceId={project.workspaceId}
            workspaceSlug={workspaceSlug}
          />
        </>
      )}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  titleClass,
  subtitle,
  count,
  children,
}: {
  icon: React.ReactNode
  title: string
  titleClass?: string
  subtitle?: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className={cn('text-sm font-semibold', titleClass)}>{title}</h3>
        {subtitle && <span className="text-muted-foreground text-xs">· {subtitle}</span>}
        <span className="text-muted-foreground text-xs">{count}</span>
      </div>
      <div className="divide-y rounded-lg border">
        {children}
      </div>
    </div>
  )
}

function IssueRow({
  issue,
  now,
  todayStr,
  onClick,
}: {
  issue: {
    id: string
    identifier: string
    title: string
    status: string
    priority: string
    dueDate?: Date | string | null
    assignee?: { name: string; avatarUrl: string | null } | null
    labels?: { label: { id: string; name: string; color: string } }[]
  }
  now: Date
  todayStr: string
  onClick: () => void
}) {
  const isOverdue = !!issue.dueDate && new Date(issue.dueDate) < now
  const isDueToday = !!issue.dueDate && new Date(issue.dueDate).toDateString() === todayStr

  return (
    <div
      className="hover:bg-muted/40 flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors first:rounded-t-lg last:rounded-b-lg"
      onClick={onClick}
    >
      {/* Status */}
      <Circle
        className={cn('size-2.5 shrink-0 fill-current', STATUS_COLORS[issue.status] ?? 'text-gray-400')}
      />

      {/* Priority */}
      {issue.priority !== 'NO_PRIORITY' && (
        <span
          className={cn('shrink-0 text-xs font-medium', PRIORITY_COLORS[issue.priority] ?? '')}
        >
          {issue.priority.charAt(0)}
        </span>
      )}

      {/* Identifier */}
      <IssueIdentifier identifier={issue.identifier} />

      {/* Title */}
      <span className="flex-1 truncate text-sm">{issue.title}</span>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <div className="hidden shrink-0 gap-1 lg:flex">
          {issue.labels.slice(0, 2).map(({ label }) => (
            <Badge
              key={label.id}
              variant="outline"
              className="text-[10px]"
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
                borderColor: label.color + '40',
              }}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Due date */}
      {issue.dueDate && (
        <span
          className={cn(
            'shrink-0 text-xs font-medium',
            isOverdue ? 'text-destructive' : isDueToday ? 'text-orange-500' : 'text-muted-foreground'
          )}
        >
          {isOverdue ? '⚠ ' : isDueToday ? '⏰ ' : ''}
          {new Date(issue.dueDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </span>
      )}

      {/* Assignee */}
      {issue.assignee ? (
        <Avatar className="size-5 shrink-0">
          <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
          <AvatarFallback className="text-[9px]">{issue.assignee.name?.charAt(0) ?? 'U'}</AvatarFallback>
        </Avatar>
      ) : (
        <div className="bg-muted size-5 shrink-0 rounded-full" />
      )}
    </div>
  )
}
