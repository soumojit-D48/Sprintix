'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { IssueStatusSelect } from '@/components/issues/IssueStatusSelect'
import { IssuePrioritySelect } from '@/components/issues/IssuePrioritySelect'
import { IssueAssigneeSelect } from '@/components/issues/IssueAssigneeSelect'
import { IssueDueDatePicker } from '@/components/issues/IssueDueDatePicker'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueSubIssues } from '@/components/issues/IssueSubIssues'

export default function IssueDetailPage() {
  const params = useParams()
  const router = useRouter()
  const issueId = params.issueId as string
  const workspaceSlug = params.workspaceSlug as string

  const { data: issue, isLoading, refetch } = trpc.issue.getById.useQuery({ issueId })
  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  const { data: members } = trpc.member.list.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

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
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.issue.delete.useMutation({
    onSuccess: () => {
      toast.success('Issue deleted')
      router.push(`/${workspaceSlug}/projects/${issue?.projectId}`)
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )
  }

  if (!issue) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2">
        <p className="text-muted-foreground text-lg">Issue not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      <div className="flex items-center gap-2 border-b px-6 py-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <IssueIdentifier identifier={issue.identifier} className="text-sm" />
        {issue.project && (
          <span className="text-muted-foreground text-xs">in {issue.project.name}</span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">
          <div className="grid grid-cols-[1fr_240px] gap-8">
            <div className="space-y-6">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                className="hover:border-border focus:border-border -ml-2 border-transparent text-xl font-semibold"
              />

              <div>
                <h4 className="text-muted-foreground mb-2 text-xs font-medium tracking-wider uppercase">
                  Description
                </h4>
                <RichTextEditor
                  content={description}
                  onChange={setDescription}
                  onDebouncedSave={handleDescriptionSave}
                  saving={isSaving}
                  placeholder="Add a description..."
                  minHeight="120px"
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
                <Field label="Status">
                  <IssueStatusSelect
                    value={issue.status}
                    onChange={(v) => handleFieldUpdate('status', v)}
                    size="sm"
                  />
                </Field>
                <Field label="Priority">
                  <IssuePrioritySelect
                    value={issue.priority}
                    onChange={(v) => handleFieldUpdate('priority', v)}
                    size="sm"
                  />
                </Field>
                <Field label="Assignee">
                  <IssueAssigneeSelect
                    value={issue.assigneeId}
                    onChange={(v) => handleFieldUpdate('assigneeId', v)}
                    members={members ?? []}
                    size="sm"
                  />
                </Field>
                <Field label="Due Date">
                  <IssueDueDatePicker
                    value={issue.dueDate ? new Date(issue.dueDate) : null}
                    onChange={(d) => handleFieldUpdate('dueDate', d?.toISOString() ?? null)}
                    size="sm"
                  />
                </Field>
              </div>

              <Separator />

              <div className="space-y-2 text-xs">
                <MetaRow label="Reporter" value={issue.reporter?.name ?? 'Unknown'} />
                {issue.sprint && <MetaRow label="Sprint" value={issue.sprint.name} />}
                {issue.parent && (
                  <MetaRow
                    label="Parent"
                    value={`${issue.parent.identifier} - ${issue.parent.title}`}
                  />
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
      </ScrollArea>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-muted-foreground mb-1 block text-xs font-medium">{label}</label>
      {children}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground min-w-[60px]">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  )
}
