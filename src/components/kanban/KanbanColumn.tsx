import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { KanbanCard } from './KanbanCard'
import { cn } from '@/lib/utils'

interface Issue {
  id: string
  title: string
  identifier: string
  priority: string
  dueDate: string | Date | null
  status: string
  order: number
  labels: any[]
  assignee: any
}

interface KanbanColumnProps {
  column: {
    key: string
    label: string
    color: string
    issues: Issue[]
  }
  onIssueClick: (id: string) => void
  onCreateIssue: (status: string) => void
}

export function KanbanColumn({ column, onIssueClick, onCreateIssue }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.key,
    data: {
      type: 'Column',
      column,
    },
  })

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', column.color)} />
          <span className="text-sm font-semibold">{column.label}</span>
          <span className="text-muted-foreground text-xs">{column.issues.length}</span>
        </div>
        <button
          type="button"
          onClick={() => onCreateIssue(column.key)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Plus className="size-3.5" />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-[150px] flex-col gap-2 overflow-y-auto rounded-lg bg-muted/30 p-2"
      >
        <SortableContext items={column.issues.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {column.issues.map((issue) => (
            <KanbanCard key={issue.id} issue={issue} onClick={onIssueClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
