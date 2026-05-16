'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, Loader2, Circle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { IssueStatusSelect } from './IssueStatusSelect'
import { IssueIdentifier } from './IssueIdentifier'
import { toast } from 'sonner'

interface IssueSubIssuesProps {
  issueId: string
  projectId: string
  workspaceSlug: string
}

const statusIcons: Record<string, string> = {
  BACKLOG: 'text-gray-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-yellow-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-red-400',
}

export function IssueSubIssues({ issueId, projectId, workspaceSlug }: IssueSubIssuesProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [subTitle, setSubTitle] = useState('')
  const [subStatus, setSubStatus] = useState('TODO')

  const { data: subIssues, refetch } = trpc.issue.listSubIssues.useQuery({ issueId })
  const createSubIssue = trpc.issue.createSubIssue.useMutation({
    onSuccess: () => {
      refetch()
      setSubTitle('')
      setShowCreate(false)
      toast.success('Sub-issue created')
    },
    onError: (err) => toast.error(err.message),
  })

  const doneCount = subIssues?.filter((s) => s.status === 'DONE').length ?? 0
  const totalCount = subIssues?.length ?? 0

  if (subIssues && subIssues.length === 0 && !showCreate) {
    return (
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Sub-issues
          </h4>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
          >
            <Plus className="size-3" />
            Add
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
            Sub-issues
          </h4>
          {totalCount > 0 && (
            <span className="text-muted-foreground text-xs">
              {doneCount} of {totalCount} done
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
        >
          <Plus className="size-3" />
          Add
        </button>
      </div>

      {totalCount > 0 && (
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-green-500 transition-all"
            style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      )}

      {subIssues?.map((sub) => (
        <Link
          key={sub.id}
          href={`/${workspaceSlug}/issues/${sub.id}`}
          className="hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors"
        >
          <Circle
            className={cn('size-3 fill-current', statusIcons[sub.status] ?? 'text-gray-400')}
          />
          <IssueIdentifier identifier={sub.identifier} />
          <span className="flex-1 truncate text-sm">{sub.title}</span>
          {sub.assignee && (
            <span className="text-muted-foreground truncate text-xs">{sub.assignee.name}</span>
          )}
        </Link>
      ))}

      {showCreate && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!subTitle.trim()) return
            createSubIssue.mutate({
              parentId: issueId,
              projectId,
              title: subTitle.trim(),
              status: subStatus as never,
              priority: 'MEDIUM' as never,
            })
          }}
          className="mt-2 flex items-center gap-2"
        >
          <Input
            placeholder="Sub-issue title"
            value={subTitle}
            onChange={(e) => setSubTitle(e.target.value)}
            className="h-8 text-sm"
            autoFocus
          />
          <IssueStatusSelect value={subStatus} onChange={setSubStatus} size="sm" />
          <Button
            type="submit"
            size="sm"
            className="h-8"
            disabled={!subTitle.trim() || createSubIssue.isPending}
          >
            {createSubIssue.isPending ? <Loader2 className="size-3 animate-spin" /> : 'Add'}
          </Button>
        </form>
      )}
    </div>
  )
}
