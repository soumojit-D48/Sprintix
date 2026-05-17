'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Trash2, Tag, MessageSquare } from 'lucide-react'
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
import { IssueLabelSelect } from '@/components/issues/IssueLabelSelect'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueSubIssues } from '@/components/issues/IssueSubIssues'
import { cn } from '@/lib/utils'

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
  const { data: labelsData } = trpc.label.list.useQuery(
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

  const utils = trpc.useUtils()

  const updateMutation = trpc.issue.update.useMutation({
    onSuccess: () => refetch(),
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.issue.delete.useMutation({
    onSuccess: () => {
      toast.success('Issue deleted')
      router.push(`/${workspaceSlug}/projects/${issue?.projectId}/board`)
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

  const selectedLabelIds = issue.labels?.map((l) => l.labelId) ?? []

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col">
      {/* Breadcrumb bar */}
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
        <div className="p-6">
          {/* Two-column layout: 60% main / 40% sidebar */}
          <div className="grid grid-cols-[1fr_260px] gap-8">
            {/* ─── Main column ─── */}
            <div className="space-y-6 min-w-0">
              {/* Editable title */}
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
                className="hover:border-border focus:border-border -ml-2 border-transparent text-xl font-semibold"
              />

              {/* Description */}
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

              {/* Sub-issues */}
              <IssueSubIssues
                issueId={issue.id}
                projectId={issue.projectId}
                workspaceSlug={workspaceSlug}
              />

              <Separator />

              {/* Activity & Comments placeholder (wired in Phase 13) */}
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <MessageSquare className="text-muted-foreground size-4" />
                  <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                    Activity & Comments
                  </h4>
                  {issue._count.comments > 0 && (
                    <span className="text-muted-foreground text-xs">
                      ({issue._count.comments})
                    </span>
                  )}
                </div>
                <div className="border-border rounded-lg border border-dashed p-6 text-center">
                  <MessageSquare className="text-muted-foreground/30 mx-auto mb-2 size-8" />
                  <p className="text-muted-foreground text-sm">
                    Activity feed and comments will be available soon.
                  </p>
                </div>
              </div>
            </div>

            {/* ─── Sidebar ─── */}
            <div className="space-y-4">
              {/* Status */}
              <Field label="Status">
                <IssueStatusSelect
                  value={issue.status}
                  onChange={(v) => handleFieldUpdate('status', v)}
                  size="sm"
                />
              </Field>

              {/* Priority */}
              <Field label="Priority">
                <IssuePrioritySelect
                  value={issue.priority}
                  onChange={(v) => handleFieldUpdate('priority', v)}
                  size="sm"
                />
              </Field>

              {/* Assignee */}
              <Field label="Assignee">
                <IssueAssigneeSelect
                  value={issue.assigneeId}
                  onChange={(v) => handleFieldUpdate('assigneeId', v)}
                  members={members ?? []}
                  size="sm"
                />
              </Field>

              {/* Due Date */}
              <Field label="Due Date">
                <IssueDueDatePicker
                  value={issue.dueDate ? new Date(issue.dueDate) : null}
                  onChange={(d) => handleFieldUpdate('dueDate', d?.toISOString() ?? null)}
                  size="sm"
                />
              </Field>

              {/* Labels — editable inline */}
              <Field label="Labels">
                <IssueLabelSelect
                  selectedIds={selectedLabelIds}
                  labels={labelsData ?? []}
                  onToggle={handleLabelToggle}
                  size="sm"
                />
              </Field>

              <Separator />

              {/* Read-only metadata */}
              <div className="space-y-2 text-xs">
                <MetaRow label="Reporter" value={issue.reporter?.name ?? 'Unknown'} />
                {issue.sprint && <MetaRow label="Sprint" value={issue.sprint.name} />}
                {issue.parent && (
                  <MetaRow
                    label="Parent"
                    value={`${issue.parent.identifier} — ${issue.parent.title}`}
                  />
                )}
                <MetaRow
                  label="Created"
                  value={new Date(issue.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                />
                <MetaRow
                  label="Updated"
                  value={new Date(issue.updatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                />
              </div>

              <Separator />

              {/* Danger zone */}
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete issue ${issue.identifier}? This cannot be undone.`)) {
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
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground min-w-[64px] shrink-0">{label}:</span>
      <span className="truncate">{value}</span>
    </div>
  )
}
