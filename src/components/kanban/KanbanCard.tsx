import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { IssueIdentifier } from '@/components/issues/IssueIdentifier'
import { cn } from '@/lib/utils'

interface Label {
  id: string
  labelId: string
  issueId: string
  label: {
    id: string
    name: string
    color: string
  }
}

interface Issue {
  id: string
  title: string
  identifier: string
  priority: string
  dueDate: string | Date | null
  status: string
  order: number
  labels: Label[]
  assignee: {
    id: string
    name: string | null
    avatarUrl: string | null
  } | null
}

interface KanbanCardProps {
  issue: Issue
  onClick: (id: string) => void
  isOverlay?: boolean
}

export function KanbanCard({ issue, onClick, isOverlay }: KanbanCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: issue.id,
    data: {
      type: 'Issue',
      issue,
    },
  })

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  }

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="h-24 rounded-lg border-2 border-dashed border-primary/50 bg-primary/5"
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onClick(issue.id)}
      className={cn(
        'group flex cursor-grab flex-col gap-2 rounded-lg border bg-card p-3 text-left shadow-sm transition-colors hover:bg-accent/50 active:cursor-grabbing',
        isOverlay && 'rotate-2 scale-105 shadow-xl cursor-grabbing ring-2 ring-primary'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <IssueIdentifier identifier={issue.identifier} />
        {issue.priority !== 'NO_PRIORITY' && (
          <span
            className={cn(
              'shrink-0 text-[10px] font-medium',
              issue.priority === 'URGENT' && 'text-red-500',
              issue.priority === 'HIGH' && 'text-orange-500',
              issue.priority === 'MEDIUM' && 'text-yellow-500',
              issue.priority === 'LOW' && 'text-blue-500'
            )}
          >
            {issue.priority}
          </span>
        )}
      </div>
      <p className="line-clamp-2 text-sm leading-snug">{issue.title}</p>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {issue.labels?.slice(0, 2).map(({ label }) => (
            <span
              key={label.id}
              className="inline-block rounded px-1 text-[10px]"
              style={{
                backgroundColor: label.color + '20',
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {issue.dueDate && (
            <span
              className={cn(
                'text-[10px]',
                new Date(issue.dueDate) < new Date()
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground'
              )}
            >
              {new Date(issue.dueDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
          {issue.assignee && (
            <Avatar className="size-5">
              <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
              <AvatarFallback className="text-[9px]">
                {issue.assignee.name?.charAt(0) ?? 'U'}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </div>
    </div>
  )
}
