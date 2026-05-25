'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface SprintCloseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sprintId: string
  projectId: string
  onClosed?: () => void
}

export function SprintCloseModal({
  open,
  onOpenChange,
  sprintId,
  projectId,
  onClosed,
}: SprintCloseModalProps) {
  const [disposition, setDisposition] = useState<string>('BACKLOG')
  const [newSprintId, setNewSprintId] = useState<string>('')

  const { data: sprint } = trpc.sprint.getById.useQuery({ sprintId }, { enabled: open })
  const { data: sprintsData } = trpc.sprint.list.useQuery({ projectId }, { enabled: open && disposition === 'NEW_SPRINT' })

  const utils = trpc.useUtils()

  const closeSprint = trpc.sprint.close.useMutation({
    onSuccess: () => {
      utils.sprint.list.invalidate({ projectId })
      utils.sprint.getById.invalidate({ sprintId })
      onClosed?.()
      toast.success('Sprint closed')
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const incompleteIssues = sprint?.issues?.filter(
    (i) => i.status !== 'DONE' && i.status !== 'CANCELLED'
  ) ?? []
  const plannedSprints = sprintsData?.filter((s) => s.status === 'PLANNED' && s.id !== sprintId) ?? []

  function handleSubmit() {
    closeSprint.mutate({
      sprintId,
      incompleteDisposition: disposition as 'BACKLOG' | 'NEW_SPRINT',
      ...(disposition === 'NEW_SPRINT' && newSprintId ? { newSprintId } : {}),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Close Sprint</DialogTitle>
          <DialogDescription>
            {incompleteIssues.length > 0
              ? `${incompleteIssues.length} issue${incompleteIssues.length !== 1 ? 's' : ''} ${
                  incompleteIssues.length !== 1 ? 'are' : 'is'
                } not completed. Choose what to do with them.`
              : 'All issues are completed. The sprint will be closed.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {incompleteIssues.length > 0 && (
            <div className="space-y-3">
              <div className="max-h-32 space-y-1 overflow-auto">
                {incompleteIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="text-muted-foreground flex items-center gap-2 text-sm"
                  >
                    <span className="text-xs">{issue.identifier}</span>
                    <span className="flex-1 truncate">{issue.title}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label>Move incomplete issues to</Label>
                <Select value={disposition} onValueChange={setDisposition}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="NEW_SPRINT">
                      Next sprint
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {disposition === 'NEW_SPRINT' && plannedSprints.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Select sprint</Label>
                  <Select value={newSprintId} onValueChange={setNewSprintId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a sprint..." />
                    </SelectTrigger>
                    <SelectContent>
                      {plannedSprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {disposition === 'NEW_SPRINT' && plannedSprints.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No planned sprints available. Create a new sprint first.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={
                closeSprint.isPending ||
                (disposition === 'NEW_SPRINT' && plannedSprints.length > 0 && !newSprintId)
              }
            >
              {closeSprint.isPending && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Close Sprint
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
