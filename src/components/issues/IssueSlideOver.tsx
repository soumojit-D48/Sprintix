'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trash2, ExternalLink } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { IssueStatusSelect } from './IssueStatusSelect'
import { IssuePrioritySelect } from './IssuePrioritySelect'
import { IssueAssigneeSelect } from './IssueAssigneeSelect'
import { IssueDueDatePicker } from './IssueDueDatePicker'
import { IssueIdentifier } from './IssueIdentifier'
import { IssueSubIssues } from './IssueSubIssues'

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

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<unknown>(null)
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : issue ? (
          <div className="flex h-full flex-col">
            <SheetHeader className="flex-shrink-0">
              <div className="flex items-center gap-2">
                <IssueIdentifier identifier={issue.identifier} />
                <button
                  type="button"
                  onClick={() => router.push(`/${workspaceSlug}/issues/${issue.id}`)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Open full page"
                >
                  <ExternalLink className="size-3.5" />
                </button>
              </div>
              <SheetTitle className="text-left">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur()
                    }
                  }}
                  className="hover:border-border focus:border-border -ml-2 border-transparent text-lg font-semibold"
                />
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1">
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
                            {issue.parent.identifier} - {issue.parent.title}
                          </span>
                        </div>
                      )}
                      {issue.labels?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {issue.labels.map(({ label }) => (
                            <span
                              key={label.id}
                              className="inline-block rounded-md border px-1.5 py-0.5 text-xs"
                              style={{
                                backgroundColor: label.color + '20',
                                color: label.color,
                                borderColor: label.color + '40',
                              }}
                            >
                              {label.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (confirm('Delete this issue?')) {
                            deleteMutation.mutate({ issueId: issue.id })
                          }
                        }}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        Delete Issue
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
