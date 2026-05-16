'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  BACKLOG: { label: 'Backlog', color: 'text-gray-500', bg: 'bg-gray-100' },
  TODO: { label: 'Todo', color: 'text-blue-600', bg: 'bg-blue-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  IN_REVIEW: { label: 'In Review', color: 'text-purple-600', bg: 'bg-purple-100' },
  DONE: { color: 'text-green-600', label: 'Done', bg: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
}

interface IssueStatusSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function IssueStatusSelect({
  value,
  onChange,
  disabled = false,
  size = 'default',
}: IssueStatusSelectProps) {
  const config = statusConfig[value] ?? { label: value, color: '', bg: '' }

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(size === 'sm' ? 'h-7 text-xs' : 'h-9', 'w-[140px]')}>
        <SelectValue>
          <span className={cn('flex items-center gap-2', config.color)}>
            <span
              className={cn(
                'size-1.5 rounded-full',
                config.bg.replace('bg-', 'bg-').replace('-100', '-500')
              )}
            />
            {config.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <span className={cn('flex items-center gap-2', cfg.color)}>
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  cfg.bg.replace('bg-', 'bg-').replace('-100', '-500')
                )}
              />
              {cfg.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { statusConfig }
