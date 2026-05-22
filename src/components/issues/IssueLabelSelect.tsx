'use client'

import { Check, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  onCreateLabel?: (name: string, color: string) => void
  onDeleteLabel?: (labelId: string) => void
  disabled?: boolean
  size?: 'sm' | 'default'
}

const PRESET_COLORS = [
  '#DC2626',
  '#EA580C',
  '#CA8A04',
  '#16A34A',
  '#06B6D4',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#6366F1',
  '#78716C',
]

export function IssueLabelSelect({
  selectedIds,
  labels,
  onToggle,
  onCreateLabel,
  onDeleteLabel,
  disabled,
  size = 'default',
}: IssueLabelSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#6366F1')

  const selected = labels.filter((l) => selectedIds.includes(l.id))
  const filtered = labels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase()))

  function handleCreateSubmit() {
    if (newLabelName.trim() && onCreateLabel) {
      onCreateLabel(newLabelName.trim(), newLabelColor)
      setNewLabelName('')
      setNewLabelColor('#6366F1')
    }
  }

  function handleRemoveLabel(e: React.MouseEvent, labelId: string) {
    e.stopPropagation()
    onToggle(labelId)
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
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => handleRemoveLabel(e, label.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation()
                          onToggle(label.id)
                        }
                      }}
                      className="ml-1 cursor-pointer"
                    >
                      <X className="size-2.5" />
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <span>Labels</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {/* Create section */}
        <div className="space-y-2 border-b p-3">
          <p className="text-xs font-medium">Create label</p>
          <div className="flex gap-2">
            <Input
              placeholder="Label name"
              value={newLabelName}
              onChange={(e) => setNewLabelName(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={handleCreateSubmit} disabled={!newLabelName.trim() || !onCreateLabel}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewLabelColor(color)}
                className={cn(
                  'size-5 rounded-full border-2 transition-all',
                  newLabelColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* List section */}
        <div className="p-1">
          <div className="px-2 py-1.5">
            <input
              placeholder="Search labels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground px-2 py-4 text-center text-xs">
                {search ? 'No labels match' : 'No labels yet'}
              </p>
            ) : (
              filtered.map((label) => {
                const isSelected = selectedIds.includes(label.id)
                return (
                  <div
                    key={label.id}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
                      isSelected ? 'bg-accent' : 'hover:bg-muted'
                    )}
                    onClick={() => onToggle(label.id)}
                  >
                    <div
                      className="size-3 rounded-full shrink-0"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="flex-1 truncate">{label.name}</span>
                    {isSelected && <Check className="size-3.5 shrink-0" />}
                    {onDeleteLabel && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteLabel(label.id)
                        }}
                        className="text-muted-foreground hover:text-destructive opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
