'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface SprintCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onCreated?: () => void
}

export function SprintCreateModal({
  open,
  onOpenChange,
  projectId,
  onCreated,
}: SprintCreateModalProps) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const utils = trpc.useUtils()

  const createSprint = trpc.sprint.create.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate({ projectId })
      onCreated?.()
      toast.success('Sprint created')
      reset()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function reset() {
    setName('')
    setStartDate('')
    setEndDate('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !startDate || !endDate) return

    createSprint.mutate({
      projectId,
      name: name.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate).toISOString(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Sprint</DialogTitle>
          <DialogDescription className="sr-only">
            Set the sprint name, start date, and end date.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="sprint-name">Sprint name</Label>
            <Input
              id="sprint-name"
              placeholder="e.g. Sprint 5"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                reset()
                onOpenChange(false)
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim() || !startDate || !endDate || createSprint.isPending}
            >
              {createSprint.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Create Sprint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
