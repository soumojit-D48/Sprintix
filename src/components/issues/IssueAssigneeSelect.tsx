'use client'

import { Check, ChevronsUpDown, User } from 'lucide-react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { useState } from 'react'

interface Member {
  id: string
  userId: string
  user: {
    id: string
    name: string
    avatarUrl: string | null
  }
}

interface IssueAssigneeSelectProps {
  value: string | null
  onChange: (value: string | null) => void
  members: Member[]
  disabled?: boolean
  size?: 'sm' | 'default'
}

export function IssueAssigneeSelect({
  value,
  onChange,
  members,
  disabled,
  size = 'default',
}: IssueAssigneeSelectProps) {
  const [open, setOpen] = useState(false)
  const selected = members.find((m) => m.userId === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size={size === 'sm' ? 'sm' : 'default'}
          disabled={disabled}
          className={cn('w-full justify-start', size === 'sm' ? 'h-7 text-xs' : 'h-9')}
        >
          {selected ? (
            <div className="flex items-center gap-2">
              <Avatar className={cn(size === 'sm' ? 'size-4' : 'size-5')}>
                <AvatarImage src={selected.user.avatarUrl ?? ''} />
                <AvatarFallback className="text-[10px]">
                  {selected.user.name?.charAt(0) ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selected.user.name}</span>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2">
              <User className={size === 'sm' ? 'size-3' : 'size-4'} />
              <span>Unassigned</span>
            </div>
          )}
          <ChevronsUpDown className="ml-auto size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="unassigned"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
              >
                <User className="mr-2 size-4" />
                <span>Unassigned</span>
                {!value && <Check className="ml-auto size-4" />}
              </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.userId}
                  value={member.user.name}
                  onSelect={() => {
                    onChange(member.userId)
                    setOpen(false)
                  }}
                >
                  <Avatar className="mr-2 size-5">
                    <AvatarImage src={member.user.avatarUrl ?? ''} />
                    <AvatarFallback className="text-[10px]">
                      {member.user.name?.charAt(0) ?? 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.user.name}</span>
                  {value === member.userId && <Check className="ml-auto size-4" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
