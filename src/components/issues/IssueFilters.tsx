'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IssueStatusSelect } from './IssueStatusSelect'
import { IssuePrioritySelect } from './IssuePrioritySelect'
import { IssueAssigneeSelect } from './IssueAssigneeSelect'
import { IssueDueDatePicker } from './IssueDueDatePicker'
import { cn } from '@/lib/utils'

interface Member {
  id: string
  userId: string
  user: { id: string; name: string; avatarUrl: string | null }
}

export interface IssueFilterValues {
  status: string[]
  priority: string[]
  assigneeId: string | null
  labelId: string | null
  dueDate: string | null
  sprintId: string | null
  search: string
}

interface IssueFiltersProps {
  filters: IssueFilterValues
  onChange: (filters: IssueFilterValues) => void
  members: Member[]
  labels: { id: string; name: string; color: string }[]
  className?: string
}

export function IssueFilters({ filters, onChange, members, labels, className }: IssueFiltersProps) {
  const activeCount = [
    filters.status.length,
    filters.priority.length,
    filters.assigneeId ? 1 : 0,
    filters.labelId ? 1 : 0,
    filters.dueDate ? 1 : 0,
    filters.sprintId ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  function clearAll() {
    onChange({
      status: [],
      priority: [],
      assigneeId: null,
      labelId: null,
      dueDate: null,
      sprintId: null,
      search: '',
    })
  }

  const toggleStatus = (value: string) => {
    onChange({
      ...filters,
      status: filters.status.includes(value)
        ? filters.status.filter((s) => s !== value)
        : [...filters.status, value],
    })
  }

  const togglePriority = (value: string) => {
    onChange({
      ...filters,
      priority: filters.priority.includes(value)
        ? filters.priority.filter((p) => p !== value)
        : [...filters.priority, value],
    })
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground mr-1 text-xs font-medium">Status:</span>
        {['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleStatus(s)}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-colors',
              filters.status.includes(s)
                ? 'bg-primary/10 border-primary text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground mr-1 text-xs font-medium">Priority:</span>
        {['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY'].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePriority(p)}
            className={cn(
              'rounded-md border px-2 py-1 text-xs transition-colors',
              filters.priority.includes(p)
                ? 'bg-primary/10 border-primary text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {p === 'NO_PRIORITY' ? 'None' : p.charAt(0) + p.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-muted-foreground mr-1 text-xs font-medium">Assignee:</span>
        <IssueAssigneeSelect
          value={filters.assigneeId}
          onChange={(id) => onChange({ ...filters, assigneeId: id })}
          members={members}
          size="sm"
        />
      </div>

      {activeCount > 0 && (
        <Badge variant="secondary" className="gap-1 px-2 text-xs">
          {activeCount} filter{activeCount > 1 ? 's' : ''}
          <button type="button" onClick={clearAll} className="ml-0.5">
            <X className="size-3" />
          </button>
        </Badge>
      )}
    </div>
  )
}
