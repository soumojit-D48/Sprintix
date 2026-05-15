'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

const PROJECT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#14B8A6',
  '#6366F1',
  '#84CC16',
  '#E11D48',
]

const PROJECT_ICONS = ['📋', '🎯', '🚀', '💡', '🎨', '⚡', '🛠️', '📊', '🔧', '📦', '🏗️', '🧪']

interface ProjectCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspaceSlug: string
}

function generateIdentifier(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase()
}

export function ProjectCreateModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceSlug,
}: ProjectCreateModalProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(PROJECT_COLORS[0])
  const [icon, setIcon] = useState(PROJECT_ICONS[0])
  const [leadId, setLeadId] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [targetDate, setTargetDate] = useState<Date | undefined>()
  const [error, setError] = useState('')
  const [identifierManuallyEdited, setIdentifierManuallyEdited] = useState(false)

  const utils = trpc.useUtils()

  const { data: members } = trpc.member.list.useQuery({ workspaceId }, { enabled: open })

  const createProject = trpc.project.create.useMutation({
    onSuccess: (project) => {
      utils.project.list.invalidate()
      toast.success('Project created successfully')
      onOpenChange(false)
      resetForm()
      router.push(`/${workspaceSlug}/projects/${project.id}`)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  function resetForm() {
    setName('')
    setIdentifier('')
    setDescription('')
    setColor(PROJECT_COLORS[0])
    setIcon(PROJECT_ICONS[0])
    setLeadId('')
    setStartDate(undefined)
    setTargetDate(undefined)
    setError('')
    setIdentifierManuallyEdited(false)
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!identifierManuallyEdited) {
      setIdentifier(generateIdentifier(value))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !identifier.trim()) {
      setError('Project name and identifier are required.')
      return
    }
    setError('')
    createProject.mutate({
      workspaceId,
      name: name.trim(),
      identifier: identifier.toUpperCase().trim(),
      description: description.trim() || undefined,
      icon,
      color,
      leadId: leadId || undefined,
      startDate: startDate?.toISOString(),
      targetDate: targetDate?.toISOString(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>Set up a new project to organize your team's work.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Project Icon</Label>
            <div className="flex flex-wrap gap-1.5">
              {PROJECT_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-md text-lg transition-colors',
                    icon === emoji
                      ? 'bg-primary/10 ring-primary ring-2 ring-offset-1'
                      : 'hover:bg-muted'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="My Project"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifier">Project Code</Label>
              <Input
                id="identifier"
                placeholder="PROJ"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value.toUpperCase())
                  setIdentifierManuallyEdited(true)
                }}
                maxLength={5}
                className="font-mono uppercase"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-all',
                    color === c && 'ring-primary ring-2 ring-offset-2'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead">Project Lead</Label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lead..." />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member) => (
                  <SelectItem key={member.id} value={member.userId}>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={member.user.avatarUrl ?? ''} />
                        <AvatarFallback className="text-[10px]">
                          {member.user.name?.charAt(0) ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{member.user.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !targetDate && 'text-muted-foreground'
                    )}
                  >
                    {targetDate ? format(targetDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !identifier.trim() || createProject.isPending}
            >
              {createProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
