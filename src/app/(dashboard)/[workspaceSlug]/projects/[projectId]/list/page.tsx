'use client'

import React, { useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Circle, ChevronDown, ChevronRight } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { IssueCreateModal } from '@/components/issues/IssueCreateModal'
import { IssueSlideOver } from '@/components/issues/IssueSlideOver'
import { IssueBulkActions } from '@/components/issues/IssueBulkActions'
import { cn } from '@/lib/utils'

const statusIcons: Record<string, string> = {
  BACKLOG: 'text-gray-400',
  TODO: 'text-blue-500',
  IN_PROGRESS: 'text-yellow-500',
  IN_REVIEW: 'text-purple-500',
  DONE: 'text-green-500',
  CANCELLED: 'text-red-400',
}

const statusOrder = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']

export default function ListPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string

  const [createOpen, setCreateOpen] = useState(false)
  const [slideOverIssueId, setSlideOverIssueId] = useState<string | null>(null)
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  
  // Collapsed groups state
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const { data: project } = trpc.project.getById.useQuery({ projectId })
  const issueQuery = trpc.issue.list.useQuery({
    projectId,
    limit: 200,
    sortBy: 'order',
    sortOrder: 'asc',
  })

  const issues = issueQuery.data?.issues ?? []
  const isLoading = issueQuery.isLoading

  // Group issues by status
  const groupedIssues = useMemo(() => {
    const groups: Record<string, typeof issues> = {}
    for (const status of statusOrder) {
      groups[status] = []
    }
    for (const issue of issues) {
      if (!groups[issue.status]) groups[issue.status] = []
      groups[issue.status]!.push(issue)
    }
    return groups
  }, [issues])

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleGroupSelection = (status: string, groupIssues: typeof issues) => {
    const groupIds = groupIssues.map(i => i.id)
    const allSelected = groupIds.every(id => selectedIds.has(id))
    
    const next = new Set(selectedIds)
    if (allSelected) {
      groupIds.forEach(id => next.delete(id))
    } else {
      groupIds.forEach(id => next.add(id))
    }
    setSelectedIds(next)
  }

  const toggleGroupCollapse = (status: string) => {
    const next = new Set(collapsedGroups)
    if (next.has(status)) next.delete(status)
    else next.add(status)
    setCollapsedGroups(next)
  }

  return (
    <div className="flex h-full flex-col relative pb-20">
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
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10 shadow-sm">
              <tr className="text-muted-foreground border-b text-xs font-medium">
                <th className="w-12 px-4 py-2 text-left" />
                <th className="w-8 px-2 py-2 text-left" />
                <th className="px-4 py-2 text-left">Issue</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Priority</th>
                <th className="px-4 py-2 text-left">Assignee</th>
                <th className="px-4 py-2 text-left">Due Date</th>
                <th className="px-4 py-2 text-left">Labels</th>
              </tr>
            </thead>
            <tbody>
              {statusOrder.map((status) => {
                const groupIssues = groupedIssues[status]
                if (!groupIssues || groupIssues.length === 0) return null
                
                const isCollapsed = collapsedGroups.has(status)
                const allSelected = groupIssues.every(i => selectedIds.has(i.id))
                const someSelected = groupIssues.some(i => selectedIds.has(i.id)) && !allSelected

                return (
                  <React.Fragment key={status}>
                    {/* Group Header */}
                    <tr className="bg-muted/30 border-b group">
                      <td className="px-4 py-2">
                        <Checkbox 
                          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                          onCheckedChange={() => toggleGroupSelection(status, groupIssues)}
                        />
                      </td>
                      <td 
                        colSpan={7} 
                        className="px-2 py-2 cursor-pointer select-none"
                        onClick={() => toggleGroupCollapse(status)}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          {isCollapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                          <span className="capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                          <Badge variant="secondary" className="ml-2 text-xs">{groupIssues.length}</Badge>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Group Rows */}
                    {!isCollapsed && groupIssues.map((issue) => (
                      <tr
                        key={issue.id}
                        className={cn(
                          "hover:bg-muted/50 border-b transition-colors group/row",
                          selectedIds.has(issue.id) && "bg-muted/50"
                        )}
                      >
                        <td className="px-4 py-2.5">
                          <Checkbox 
                            checked={selectedIds.has(issue.id)}
                            onCheckedChange={() => toggleSelection(issue.id)}
                          />
                        </td>
                        <td 
                          className="px-2 py-2.5 cursor-pointer"
                          onClick={() => setSlideOverIssueId(issue.id)}
                        >
                          <Circle
                            className={cn(
                              'size-3 fill-current',
                              statusIcons[issue.status] ?? 'text-gray-400'
                            )}
                          />
                        </td>
                        <td 
                          className="px-4 py-2.5 cursor-pointer"
                          onClick={() => setSlideOverIssueId(issue.id)}
                        >
                          <div className="flex items-center gap-2">
                            <IssueIdentifier identifier={issue.identifier} />
                            <span className="truncate max-w-[300px]">{issue.title}</span>
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
                          <div className="flex flex-wrap gap-1">
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
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedIds.size > 0 && (
        <IssueBulkActions 
          selectedIds={Array.from(selectedIds)}
          onClearSelection={() => setSelectedIds(new Set())}
          workspaceSlug={workspaceSlug}
          projectId={projectId}
        />
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
