'use client'

import { Check, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Label {
  id: string
  name: string
  color: string
}

interface IssueLabelSelectProps {
  selectedIds: string[]
  labels: Label[]
  onToggle: (labelId: string) => void
  onCreateLabel?: (name: string) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function IssueLabelSelect({
  selectedIds,
  labels,
  onToggle,
  onCreateLabel,
  disabled,
  size = 'default',
}: IssueLabelSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selected = labels.filter((l) => selectedIds.includes(l.id))

  const handleCreate = () => {
    if (search.trim() && onCreateLabel) {
      onCreateLabel(search.trim())
      setSearch('')
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          disabled={disabled}
          className={cn(
            'w-full justify-start',
            size === 'sm' ? 'h-7 text-xs' : 'h-9',
            !selected.length && 'text-muted-foreground'
          )}
        >
          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selected.map((label) => (
                <Badge
                  key={label.id}
                  style={{
                    backgroundColor: label.color + '20',
                    color: label.color,
                    borderColor: label.color + '40',
                  }}
                  className="border px-1.5 py-0 text-xs"
                >
                  {label.name}
                  {!disabled && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onToggle(label.id)
                      }}
                      className="ml-1"
                    >
                      <X className="size-2.5" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <span>Labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search labels..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {onCreateLabel ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleCreate}
                >
                  <Plus className="mr-2 size-4" />
                  Create &quot;{search}&quot;
                </Button>
              ) : (
                'No labels found.'
              )}
            </CommandEmpty>
            <CommandGroup>
              {labels.map((label) => {
                const isSelected = selectedIds.includes(label.id)
                return (
                  <CommandItem
                    key={label.id}
                    value={label.name}
                    onSelect={() => onToggle(label.id)}
                  >
                    <div
                      className="mr-2 size-3 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span>{label.name}</span>
                    {isSelected && <Check className="ml-auto size-4" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
