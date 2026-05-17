'use client'

import { X, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { IssueAssigneeSelect } from './IssueAssigneeSelect'
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

const STATUS_OPTIONS = [
  { value: 'BACKLOG', label: 'Backlog', color: 'bg-gray-400' },
  { value: 'TODO', label: 'Todo', color: 'bg-blue-500' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-500' },
  { value: 'IN_REVIEW', label: 'In Review', color: 'bg-purple-500' },
  { value: 'DONE', label: 'Done', color: 'bg-green-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-400' },
]

const PRIORITY_OPTIONS = [
  { value: 'URGENT', label: 'Urgent', color: 'text-red-500' },
  { value: 'HIGH', label: 'High', color: 'text-orange-500' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-yellow-500' },
  { value: 'LOW', label: 'Low', color: 'text-blue-500' },
  { value: 'NO_PRIORITY', label: 'None', color: 'text-muted-foreground' },
]

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
    <div className={cn('space-y-2', className)}>
      {/* Search input */}
      <div className="relative">
        <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
        <Input
          placeholder="Search issues..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="h-8 pl-8 text-sm"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: '' })}
            className="text-muted-foreground hover:text-foreground absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Status filters */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs font-medium">Status:</span>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => toggleStatus(s.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors',
                filters.status.includes(s.value)
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <span className={cn('size-1.5 rounded-full', s.color)} />
              {s.label}
            </button>
          ))}
        </div>

        {/* Priority filters */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs font-medium">Priority:</span>
          {PRIORITY_OPTIONS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => togglePriority(p.value)}
              className={cn(
                'rounded-md border px-2 py-1 text-xs transition-colors',
                filters.priority.includes(p.value)
                  ? 'bg-primary/10 border-primary text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Assignee filter */}
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground mr-1 text-xs font-medium">Assignee:</span>
          <IssueAssigneeSelect
            value={filters.assigneeId}
            onChange={(id) => onChange({ ...filters, assigneeId: id })}
            members={members}
            size="sm"
          />
        </div>

        {/* Label filter */}
        {labels.length > 0 && (
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground mr-1 text-xs font-medium">Label:</span>
            <div className="flex flex-wrap gap-1">
              {labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      labelId: filters.labelId === label.id ? null : label.id,
                    })
                  }
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs transition-colors',
                    filters.labelId === label.id
                      ? 'font-medium'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                  style={
                    filters.labelId === label.id
                      ? {
                          backgroundColor: label.color + '20',
                          color: label.color,
                          borderColor: label.color + '60',
                        }
                      : {}
                  }
                >
                  {label.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active filter count + clear */}
        {activeCount > 0 && (
          <Badge variant="secondary" className="gap-1 px-2 text-xs">
            {activeCount} filter{activeCount > 1 ? 's' : ''}
            <button type="button" onClick={clearAll} className="ml-0.5 hover:opacity-70">
              <X className="size-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  )
}
