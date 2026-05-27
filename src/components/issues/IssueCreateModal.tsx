'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { IssueStatusSelect } from './IssueStatusSelect'
import { IssuePrioritySelect } from './IssuePrioritySelect'
import { IssueAssigneeSelect } from './IssueAssigneeSelect'
import { IssueDueDatePicker } from './IssueDueDatePicker'
import { IssueLabelSelect } from './IssueLabelSelect'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

interface IssueCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  workspaceId: string
  workspaceSlug: string
  defaultStatus?: string
  sprintId?: string
  onCreated?: () => void
}

export function IssueCreateModal({
  open,
  onOpenChange,
  projectId,
  workspaceId,
  workspaceSlug,
  defaultStatus = 'TODO',
  sprintId,
  onCreated,
}: IssueCreateModalProps) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState(defaultStatus)
  const [priority, setPriority] = useState('MEDIUM')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [labelIds, setLabelIds] = useState<string[]>([])
  const [description, setDescription] = useState<unknown>(null)
  const [showDescription, setShowDescription] = useState(false)

  const { data: members } = trpc.member.list.useQuery({ workspaceId }, { enabled: open })
  const { data: labelsData } = trpc.label.list.useQuery({ workspaceId }, { enabled: open })
  const { data: project } = trpc.project.getById.useQuery({ projectId }, { enabled: open })

  const createLabel = trpc.label.create.useMutation({
    onSuccess: () => utils.label.list.invalidate({ workspaceId }),
    onError: (err) => toast.error(err.message),
  })

  const deleteLabel = trpc.label.delete.useMutation({
    onSuccess: () => utils.label.list.invalidate({ workspaceId }),
    onError: (err) => toast.error(err.message),
  })

  const createIssue = trpc.issue.create.useMutation({
    onSuccess: (issue) => {
      utils.issue.list.invalidate({ projectId })
      toast.success(`${issue.identifier} created`, {
        action: {
          label: 'Open',
          onClick: () => router.push(`/${workspaceSlug}/issues/${issue.id}`),
        },
      })
      onCreated?.()
      reset()
      onOpenChange(false)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  function reset() {
    setTitle('')
    setStatus(defaultStatus)
    setPriority('MEDIUM')
    setAssigneeId(null)
    setDueDate(null)
    setLabelIds([])
    setDescription(null)
    setShowDescription(false)
  }

  function handleCreateLabel(name: string, color: string) {
    createLabel.mutate({ workspaceId, name, color })
  }

  function handleDeleteLabel(labelId: string) {
    deleteLabel.mutate({ labelId })
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    createIssue.mutate({
      projectId,
      title: title.trim(),
      status: status as never,
      priority: priority as never,
      assigneeId,
      dueDate: dueDate?.toISOString(),
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      description: description ?? undefined,
      sprintId: sprintId ?? null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription className="sr-only">Fill out the form below to create a new issue.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            className="text-base font-medium"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Status</Label>
              <IssueStatusSelect value={status} onChange={setStatus} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Priority</Label>
              <IssuePrioritySelect value={priority} onChange={setPriority} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Assignee</Label>
              <IssueAssigneeSelect
                value={assigneeId}
                onChange={setAssigneeId}
                members={members ?? []}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Due Date</Label>
              <IssueDueDatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Labels</Label>
            <IssueLabelSelect
              selectedIds={labelIds}
              labels={labelsData ?? []}
              onToggle={(id) =>
                setLabelIds((prev) =>
                  prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]
                )
              }
              onCreateLabel={handleCreateLabel}
              onDeleteLabel={handleDeleteLabel}
            />
          </div>

          {project?.activeSprint && (
            <p className="text-muted-foreground text-xs">
              Will be added to active sprint: {project.activeSprint.name}
            </p>
          )}

          <div>
            <button
              type="button"
              onClick={() => setShowDescription(!showDescription)}
              className="text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              {showDescription ? 'Hide' : 'Add'} description
            </button>
            {showDescription && (
              <div className="mt-2">
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  placeholder="Add a description..."
                  minHeight="100px"
                />
              </div>
            )}
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
            <Button type="submit" size="sm" disabled={!title.trim() || createIssue.isPending}>
              {createIssue.isPending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
