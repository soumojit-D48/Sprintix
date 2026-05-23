'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { trpc } from '@/lib/trpc/provider'

interface ChannelCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}

export function ChannelCreateDialog({ open, onOpenChange, workspaceId }: ChannelCreateDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const utils = trpc.useUtils()

  const createChannel = trpc.channel.create.useMutation({
    onSuccess: () => {
      utils.channel.list.invalidate({ workspaceId })
      setName('')
      setDescription('')
      onOpenChange(false)
      toast.success('Channel created')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    createChannel.mutate({
      workspaceId,
      name: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description.trim() || undefined,
      type: 'PUBLIC',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a channel</DialogTitle>
            <DialogDescription>
              Channels are where your team communicates. They&apos;re best when organized around a
              topic or project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel-name">Name</Label>
              <div className="relative">
                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 text-sm">
                  #
                </span>
                <Input
                  id="channel-name"
                  placeholder="e.g. design-reviews"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-7"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel-description">Description (optional)</Label>
              <Textarea
                id="channel-description"
                placeholder="What's this channel about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createChannel.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createChannel.isPending || !name.trim()}>
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
