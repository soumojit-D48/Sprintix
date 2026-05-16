'use client'

import { CalendarIcon } from 'lucide-react'
import { format, isPast, isToday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface IssueDueDatePickerProps {
  value: Date | null | undefined
  onChange: (date: Date | null) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function IssueDueDatePicker({
  value,
  onChange,
  disabled,
  size = 'default',
}: IssueDueDatePickerProps) {
  const isOverdue = value && isPast(value) && !isToday(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          disabled={disabled}
          className={cn(
            'w-full justify-start',
            size === 'sm' ? 'h-7 text-xs' : 'h-9',
            !value && 'text-muted-foreground',
            isOverdue && 'text-destructive border-destructive/50'
          )}
        >
          <CalendarIcon className={cn('mr-2 size-3.5', isOverdue && 'text-destructive')} />
          {value ? format(value, 'MMM d, yyyy') : 'No due date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => onChange(date ?? null)}
          initialFocus
        />
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => onChange(null)}
            >
              Clear due date
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
