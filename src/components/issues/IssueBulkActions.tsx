'use client'

import { useState } from 'react'
import { Check, X, Tag, User, Clock, Trash } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface IssueBulkActionsProps {
  selectedIds: string[]
  onClearSelection: () => void
  workspaceSlug: string
  projectId: string
}

export function IssueBulkActions({
  selectedIds,
  onClearSelection,
  workspaceSlug,
  projectId,
}: IssueBulkActionsProps) {
  const utils = trpc.useUtils()

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const { data: members } = trpc.member.list.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const bulkUpdateMutation = trpc.issue.bulkUpdate.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate({ projectId })
      onClearSelection()
      toast.success('Issues updated successfully')
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update issues')
    },
  })

  const deleteMutation = trpc.issue.delete.useMutation({
    onSuccess: () => {
      utils.issue.list.invalidate({ projectId })
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete issue')
    },
  })

  if (selectedIds.length === 0) return null

  const handleUpdateStatus = (status: 'TODO' | 'BACKLOG' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED') => {
    bulkUpdateMutation.mutate({ issueIds: selectedIds, status })
  }

  const handleUpdatePriority = (priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NO_PRIORITY') => {
    bulkUpdateMutation.mutate({ issueIds: selectedIds, priority })
  }

  const handleUpdateAssignee = (assigneeId: string | null) => {
    bulkUpdateMutation.mutate({ issueIds: selectedIds, assigneeId })
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete the selected issues?')) {
      await Promise.all(
        selectedIds.map((id) => deleteMutation.mutateAsync({ issueId: id }))
      )
      onClearSelection()
      toast.success('Issues deleted successfully')
    }
  }

  const isPending = bulkUpdateMutation.isPending || deleteMutation.isPending

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-2 bg-background border shadow-lg rounded-full px-4 py-2">
        <span className="text-sm font-medium mr-2">
          {selectedIds.length} selected
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full" disabled={isPending}>
              <Tag className="mr-2 size-4" />
              Set Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleUpdateStatus('TODO')}>Todo</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('IN_PROGRESS')}>In Progress</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('IN_REVIEW')}>In Review</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('DONE')}>Done</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdateStatus('CANCELLED')}>Cancelled</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full" disabled={isPending}>
              <Clock className="mr-2 size-4" />
              Set Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleUpdatePriority('NO_PRIORITY')}>No Priority</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdatePriority('LOW')}>Low</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdatePriority('MEDIUM')}>Medium</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdatePriority('HIGH')}>High</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleUpdatePriority('URGENT')}>Urgent</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="rounded-full" disabled={isPending}>
              <User className="mr-2 size-4" />
              Assign
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleUpdateAssignee(null)}>Unassigned</DropdownMenuItem>
            <DropdownMenuSeparator />
            {members?.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => handleUpdateAssignee(member.userId)}
                className="flex items-center gap-2"
              >
                <Avatar className="size-5">
                  <AvatarImage src={member.user.avatarUrl ?? ''} />
                  <AvatarFallback className="text-[10px]">
                    {member.user.name?.charAt(0) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                {member.user.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive border-transparent"
          onClick={handleDelete}
          disabled={isPending}
        >
          <Trash className="mr-2 size-4" />
          Delete
        </Button>

        <div className="w-px h-6 bg-border mx-2" />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground"
          onClick={onClearSelection}
          disabled={isPending}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
