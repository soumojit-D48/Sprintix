'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Circle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { cn } from '@/lib/utils'

const statusIcons: Record<string, string> = {
  BACKLOG: 'text-gray-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-yellow-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-red-400',
}

export default function ListPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  const [createOpen, setCreateOpen] = useState(false)
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)

  const { data: project } = trpc.project.getById.useQuery({ projectId })
  const issueQuery = trpc.issue.list.useQuery({
    projectId,
    limit: 200,
    sortBy: 'order',
    sortOrder: 'asc',
  })

  const issues = issueQuery.data?.issues ?? []
  const isLoading = issueQuery.isLoading

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-6 py-3">
        <span className="text-sm font-medium">
          {issues.length} issue{issues.length !== 1 ? 's' : ''}
        </span>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 size-4" />
          Create Issue
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : issues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">No issues yet</p>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr className="text-muted-foreground border-b text-xs font-medium">
                <th className="w-8 px-4 py-2 text-left" />
                <th className="px-4 py-2 text-left">Issue</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Assignee</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Labels</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue) => (
                <tr
                  key={issue.id}
                  className="hover:bg-muted/50 cursor-pointer border-b transition-colors"
                  onClick={() => setSlideOverIssueId(issue.id)}
                >
                  <td className="px-4 py-2.5">
                    <Circle
                      className={cn(
                        'size-3 fill-current',
                        statusIcons[issue.status] ?? 'text-gray-400'
                      )}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <IssueIdentifier identifier={issue.identifier} />
                      <span className="truncate text-sm">{issue.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs capitalize">
                      {issue.status.toLowerCase().replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        'text-xs font-medium',
                        issue.priority === 'URGENT' && 'text-red-500',
                        issue.priority === 'HIGH' && 'text-orange-500',
                        issue.priority === 'MEDIUM' && 'text-yellow-500',
                        issue.priority === 'LOW' && 'text-blue-500',
                        issue.priority === 'NO_PRIORITY' && 'text-muted-foreground'
                      )}
                    >
                      {issue.priority === 'NO_PRIORITY'
                        ? '—'
                        : issue.priority.charAt(0) + issue.priority.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {issue.assignee ? (
                      <Avatar className="size-6">
                        <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                        <AvatarFallback className="text-[10px]">
                          {issue.assignee.name?.charAt(0) ?? 'U'}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-muted-foreground text-xs">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {issue.dueDate ? (
                      <span
                        className={cn(
                          'text-xs',
                          new Date(issue.dueDate) < new Date()
                            ? 'text-destructive font-medium'
                            : 'text-muted-foreground'
                        )}
                      >
                        {new Date(issue.dueDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1">
                      {issue.labels?.slice(0, 3).map(({ label }) => (
                        <Badge
                          key={label.id}
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            backgroundColor: label.color + '20',
                            color: label.color,
                            borderColor: label.color + '40',
                          }}
                        >
                          {label.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {project && (
        <>
          <IssueCreateModal
            open={createOpen}
            onOpenChange={setCreateOpen}
            projectId={projectId}
            workspaceId={project.workspaceId ?? ''}
            workspaceSlug={workspaceSlug}
          />
          <IssueSlideOver
            open={!!slideOverIssueId}
            onOpenChange={(open) => {
              if (!open) setSlideOverIssueId(null)
            }}
            issueId={slideOverIssueId ?? ''}
            workspaceId={project.workspaceId ?? ''}
            workspaceSlug={workspaceSlug}
          />
        </>
      )}
    </div>
  )
}
