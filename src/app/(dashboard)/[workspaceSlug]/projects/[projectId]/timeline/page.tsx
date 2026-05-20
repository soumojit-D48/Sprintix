'use client'

import { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import {
  CalendarRange,
  Plus,
} from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { cn } from '@/lib/utils'
import { differenceInDays, startOfWeek, addDays, format, startOfMonth, addMonths, endOfMonth, isSameDay } from 'date-fns'

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'bg-gray-400',
  TODO: 'bg-blue-500',
  IN_PROGRESS: 'bg-yellow-500',
  IN_REVIEW: 'bg-purple-500',
  DONE: 'bg-green-500',
  CANCELLED: 'bg-red-400',
}

type ZoomLevel = 'week' | 'month'

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
    limit: 200,
    sortBy: 'dueDate',
    sortOrder: 'asc',
  })

  const issues = issueData?.issues ?? []
  
  // Calculate timeline bounds
  const now = new Date()
  
  const timelineBounds = useMemo(() => {
    let minDate = new Date()
    let maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 30) // Default +30 days
    minDate.setDate(minDate.getDate() - 7) // Default -7 days

    issues.forEach((issue) => {
      // Use createdAt as start date for simplicity in this demo
      const start = new Date((issue as any).createdAt || new Date())
      if (start < minDate) minDate = start
      if (issue.dueDate) {
        const end = new Date(issue.dueDate)
        if (end > maxDate) maxDate = end
      }
    })

    // Pad the bounds slightly
    const start = startOfWeek(minDate)
    const end = addDays(maxDate, 14)
    
    return { start, end }
  }, [issues])

  // Generate date columns
  const dateColumns = useMemo(() => {
    const cols = []
    let current = timelineBounds.start
    while (current <= timelineBounds.end) {
      cols.push(current)
      current = addDays(current, 1)
    }
    return cols
  }, [timelineBounds])

  const totalDays = dateColumns.length

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <CalendarRange className="text-muted-foreground size-4" />
          <span className="text-sm font-medium">Timeline</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <div className="flex overflow-hidden rounded-md border">
            {(['week', 'month'] as ZoomLevel[]).map((z) => (
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

      {/* Gantt Chart Area */}
      {isLoading ? (
        <div className="space-y-4 p-6">
          <Skeleton className="mb-2 h-10 w-full" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-md" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">No issues yet</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden relative">
          
          {/* Left Fixed Column: Issue Titles */}
          <div className="w-64 border-r shrink-0 flex flex-col bg-background z-20 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)] relative">
            <div className="h-12 border-b flex items-center px-4 font-medium text-xs text-muted-foreground bg-muted/30">
              Issue
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="pt-2 pb-10">
                {issues.map(issue => (
                  <div 
                    key={issue.id} 
                    className="h-10 px-4 flex items-center border-b border-transparent hover:bg-muted/50 cursor-pointer group"
                    onClick={() => setSlideOverIssueId(issue.id)}
                  >
                    <span className="text-xs truncate" title={issue.title}>{issue.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Scrollable Column: Timeline Grid */}
          <div className="flex-1 overflow-auto relative custom-scrollbar">
            {/* Header: Months/Weeks */}
            <div className="sticky top-0 z-10 bg-background border-b flex h-12 shadow-sm">
              {dateColumns.map((date, i) => {
                // Show label only if it's the start of week or month based on zoom
                let showLabel = false
                let label = ''
                
                if (zoom === 'month') {
                  if (date.getDate() === 1 || i === 0) {
                    showLabel = true
                    label = format(date, 'MMM d')
                  }
                } else if (zoom === 'week') {
                  if (date.getDay() === 1 || i === 0) {
                    showLabel = true
                    label = format(date, 'MMM d')
                  }
                }

                // Adjust column width based on zoom
                const colWidth = zoom === 'week' ? 40 : 20

                return (
                  <div 
                    key={i} 
                    className="shrink-0 border-r border-border/50 relative flex flex-col justify-end pb-1"
                    style={{ width: colWidth }}
                  >
                    {showLabel && (
                      <span className="absolute -top-1 left-1 text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                        {label}
                      </span>
                    )}
                    {/* Day number for week view */}
                    {zoom === 'week' && (
                      <span className="text-[9px] text-muted-foreground/70 text-center w-full">
                        {format(date, 'EE').charAt(0)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Grid Area */}
            <div className="relative pt-2 pb-10" style={{ width: dateColumns.length * (zoom === 'week' ? 40 : 20) }}>
              
              {/* Vertical Grid Lines & Today Line */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dateColumns.map((date, i) => {
                  const isToday = isSameDay(date, now)
                  const colWidth = zoom === 'week' ? 40 : 20
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "shrink-0 h-full border-r border-border/30",
                        isToday && "border-r-red-500 bg-red-500/5 z-0"
                      )}
                      style={{ width: colWidth }}
                    />
                  )
                })}
              </div>

              {/* Bars */}
              <div className="relative z-10">
                {issues.map(issue => {
                  const start = new Date((issue as any).createdAt || new Date())
                  const end = issue.dueDate ? new Date(issue.dueDate) : addDays(start, 2) // default 2 days if no due date
                  
                  // Calculate left offset and width
                  const daysFromStart = differenceInDays(start, timelineBounds.start)
                  const duration = Math.max(1, differenceInDays(end, start))
                  
                  const colWidth = zoom === 'week' ? 40 : 20
                  const left = daysFromStart * colWidth
                  const width = duration * colWidth

                  const colorClass = STATUS_COLORS[issue.status] || 'bg-gray-400'

                  return (
                    <div 
                      key={issue.id} 
                      className="h-10 relative flex items-center group cursor-pointer"
                      onClick={() => setSlideOverIssueId(issue.id)}
                    >
                      {/* Interactive Bar */}
                      <div 
                        className={cn(
                          "absolute h-6 rounded-full opacity-80 hover:opacity-100 transition-opacity shadow-sm flex items-center px-2",
                          colorClass
                        )}
                        style={{ left: `${Math.max(0, left)}px`, width: `${width}px`, minWidth: '8px' }}
                      >
                        <span className="text-[10px] text-white font-medium truncate drop-shadow-sm">
                          {issue.identifier}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
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
