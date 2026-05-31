'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, ExternalLink } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { IssueStatusSelect } from './IssueStatusSelect'
import { IssuePrioritySelect } from './IssuePrioritySelect'
import { IssueAssigneeSelect } from './IssueAssigneeSelect'
import { IssueDueDatePicker } from './IssueDueDatePicker'
import { IssueLabelSelect } from './IssueLabelSelect'
import { IssueIdentifier } from './IssueIdentifier'
import { IssueSubIssues } from './IssueSubIssues'
import { IssueActivityFeed } from '@/components/issues/IssueDetail/IssueActivityFeed'

interface IssueSlideOverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issueId: string
  workspaceId: string
  workspaceSlug: string
}

export function IssueSlideOver({
  open,
  onOpenChange,
  issueId,
  workspaceId,
  workspaceSlug,
}: IssueSlideOverProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const {
    data: issue,
    isLoading,
    refetch,
  } = trpc.issue.getById.useQuery({ issueId }, { enabled: open })
  const { data: members } = trpc.member.list.useQuery({ workspaceId }, { enabled: open })
  const { data: labelsData } = trpc.label.list.useQuery({ workspaceId }, { enabled: open })
  const { data: currentMember } = trpc.member.getCurrentMember.useQuery(
    { workspaceId },
    { enabled: open }
  )

  const createLabel = trpc.label.create.useMutation({
    onSuccess: () => utils.label.list.invalidate({ workspaceId }),
    onError: (err) => toast.error(err.message),
  })

  const deleteLabel = trpc.label.delete.useMutation({
    onSuccess: () => utils.label.list.invalidate({ workspaceId }),
    onError: (err) => toast.error(err.message),
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<unknown>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (issue) {
      setTitle(issue.title)
      setDescription(issue.description)
    }
  }, [issue])

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => {
      refetch()
      utils.issue.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.issue.delete.useMutation({
    onSuccess: () => {
      toast.success('Issue deleted')
      utils.issue.list.invalidate()
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const addLabelMutation = trpc.issue.addLabel.useMutation({
    onSuccess: () => {
      refetch()
      utils.issue.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const removeLabelMutation = trpc.issue.removeLabel.useMutation({
    onSuccess: () => {
      refetch()
      utils.issue.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleFieldUpdate(field: string, value: unknown) {
    updateMutation.mutate({ issueId, [field]: value } as never)
  }

  function handleTitleSave() {
    if (title.trim() && title !== issue?.title) {
      handleFieldUpdate('title', title.trim())
    }
  }

  function handleDescriptionSave() {
    if (description !== issue?.description) {
      setIsSaving(true)
      updateMutation.mutate({ issueId, description } as never, {
        onSettled: () => setIsSaving(false),
      })
    }
  }

  function handleLabelToggle(labelId: string) {
    const currentIds = issue?.labels?.map((l) => l.labelId) ?? []
    if (currentIds.includes(labelId)) {
      removeLabelMutation.mutate({ issueId, labelId })
    } else {
      addLabelMutation.mutate({ issueId, labelId })
    }
  }

  function handleCreateLabel(name: string, color: string) {
    createLabel.mutate({ workspaceId, name, color })
  }

  function handleDeleteLabel(labelId: string) {
    deleteLabel.mutate({ labelId })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="w-full sm:max-w-3xl md:max-w-4xl"
        onInteractOutside={(e) => {
          const detail = (e as any).detail
          const target = detail?.originalEvent?.target as HTMLElement | null
          if (target?.closest?.('.mention-suggestion-popup')) {
            e.preventDefault()
          }
        }}
      >
        <SheetTitle className="sr-only">Issue details</SheetTitle>
        <SheetDescription className="sr-only">View and edit details, description, and settings for this issue.</SheetDescription>
        
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : issue ? (
          <>
            <SheetHeader className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <IssueIdentifier identifier={issue.identifier} />
                <button
                  type="button"
                  onClick={() => router.push(`/${workspaceSlug}/issues/${issue.id}`)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-accent"
                  title="Open in full page view"
                >
                  <ExternalLink className="size-3" />
                  Open
                </button>
              </div>
              <div className="text-left pt-2 pb-4">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="hover:bg-muted focus:bg-transparent -ml-2 border-transparent text-2xl font-semibold font-sans shadow-none focus-visible:ring-1"
                />
              </div>
            </SheetHeader>

            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-6 p-1">
                <div className="grid grid-cols-[1fr_200px] gap-6">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wider uppercase">
                        Description
                      </h4>
                      <RichTextEditor
                        content={description}
                        onChange={setDescription}
                        onDebouncedSave={handleDescriptionSave}
                        saving={isSaving}
                        placeholder="Add a description..."
                        minHeight="100px"
                      />
                    </div>

                    <Separator />

                    <IssueSubIssues
                      issueId={issue.id}
                      projectId={issue.projectId}
                      workspaceSlug={workspaceSlug}
                    />

                    <Separator />

                    <IssueActivityFeed
                      issueId={issue.id}
                      workspaceId={workspaceId}
                      currentUserId={currentMember?.user.id}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Status
                        </label>
                        <IssueStatusSelect
                          value={issue.status}
                          onChange={(v) => handleFieldUpdate('status', v)}
                          size="sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Priority
                        </label>
                        <IssuePrioritySelect
                          value={issue.priority}
                          onChange={(v) => handleFieldUpdate('priority', v)}
                          size="sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Assignee
                        </label>
                        <IssueAssigneeSelect
                          value={issue.assigneeId}
                          onChange={(v) => handleFieldUpdate('assigneeId', v)}
                          members={members ?? []}
                          size="sm"
                        />
                      </div>
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Due Date
                        </label>
                        <IssueDueDatePicker
                          value={issue.dueDate ? new Date(issue.dueDate) : null}
                          onChange={(d) => handleFieldUpdate('dueDate', d?.toISOString() ?? null)}
                          size="sm"
                        />
                      </div>

                      {/* Labels — editable */}
                      <div>
                        <label className="text-muted-foreground mb-1 block text-xs font-medium">
                          Labels
                        </label>
                        <IssueLabelSelect
                          selectedIds={issue.labels?.map((l) => l.labelId) ?? []}
                          labels={labelsData ?? []}
                          onToggle={handleLabelToggle}
                          onCreateLabel={handleCreateLabel}
                          onDeleteLabel={handleDeleteLabel}
                          size="sm"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Reporter:</span>
                        <span>{issue.reporter?.name ?? 'Unknown'}</span>
                      </div>
                      {issue.sprint && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Sprint:</span>
                          <span>{issue.sprint.name}</span>
                        </div>
                      )}
                      {issue.parent && (
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">Parent:</span>
                          <span>
                            {issue.parent.identifier} — {issue.parent.title}
                          </span>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                        <DialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="w-full">
                            <Trash2 className="mr-1.5 size-3.5" />
                            Delete Issue
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Issue</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete this issue? This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={() => {
                              deleteMutation.mutate({ issueId: issue.id })
                              setDeleteOpen(false)
                            }}>
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
