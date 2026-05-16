'use client'

import { ArrowUp, ArrowDown, Minus, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

type PriorityKey = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_PRIORITY'

const priorityConfig: Record<PriorityKey, { label: string; color: string; icon: React.ReactNode }> =
  {
    URGENT: {
      label: 'Urgent',
      color: 'text-red-600',
      icon: <AlertCircle className="size-3.5" />,
    },
    HIGH: {
      label: 'High',
      color: 'text-orange-500',
      icon: <ArrowUp className="size-3.5" />,
    },
    MEDIUM: {
      label: 'Medium',
      color: 'text-yellow-500',
      icon: <Minus className="size-3.5" />,
    },
    LOW: {
      label: 'Low',
      color: 'text-blue-500',
      icon: <ArrowDown className="size-3.5" />,
    },
    NO_PRIORITY: {
      label: 'No Priority',
      color: 'text-muted-foreground',
      icon: <Minus className="size-3.5 opacity-40" />,
    },
  }

interface IssuePrioritySelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function IssuePrioritySelect({
  value,
  onChange,
  disabled = false,
  size = 'default',
}: IssuePrioritySelectProps) {
  const config = priorityConfig[value as PriorityKey] ?? priorityConfig.NO_PRIORITY

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn(size === 'sm' ? 'h-7 text-xs' : 'h-9', 'w-[140px]')}>
        <SelectValue>
          <span className={cn('flex items-center gap-2', config.color)}>
            {config.icon}
            {config.label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(
          Object.entries(priorityConfig) as [PriorityKey, (typeof priorityConfig)[PriorityKey]][]
        ).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <span className={cn('flex items-center gap-2', cfg.color)}>
              {cfg.icon}
              {cfg.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export { priorityConfig }
