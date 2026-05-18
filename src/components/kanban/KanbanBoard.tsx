'use client'

import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'

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

interface KanbanColumnData {
  key: string
  label: string
  color: string
  issues: Issue[]
}

interface KanbanBoardProps {
  columns: KanbanColumnData[]
  onIssueClick: (id: string) => void
  onCreateIssue: (status: string) => void
  onDragEnd: (issueId: string, newStatus: string, newOrder: number) => void
}

export function KanbanBoard({ columns: initialColumns, onIssueClick, onCreateIssue, onDragEnd }: KanbanBoardProps) {
  const [columns, setColumns] = useState<KanbanColumnData[]>(initialColumns)
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)

  // Update local state when props change
  useEffect(() => {
    setColumns(initialColumns)
  }, [initialColumns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const id = active.id as string
    
    let issue: Issue | null = null
    for (const col of columns) {
      const found = col.issues.find((i) => i.id === id)
      if (found) {
        issue = found
        break
      }
    }
    
    if (issue) setActiveIssue(issue)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return

    const isActiveTask = active.data.current?.type === 'Issue'
    const isOverTask = over.data.current?.type === 'Issue'
    const isOverColumn = over.data.current?.type === 'Column'

    if (!isActiveTask) return

    setColumns((cols) => {
      const activeColIndex = cols.findIndex((col) => col.issues.some((i) => i.id === activeId))
      
      let overColIndex = -1
      if (isOverTask) {
        overColIndex = cols.findIndex((col) => col.issues.some((i) => i.id === overId))
      } else if (isOverColumn) {
        overColIndex = cols.findIndex((col) => col.key === overId)
      }
      
      if (activeColIndex === -1 || overColIndex === -1) return cols
      
      const activeCol = cols[activeColIndex]
      const overCol = cols[overColIndex]

      if (!activeCol || !overCol) return cols

      if (activeCol.key !== overCol.key) {
        const activeIssueIndex = activeCol.issues.findIndex((i) => i.id === activeId)
        const issueToMove = activeCol.issues[activeIssueIndex]
        
        let newIndex = overCol.issues.length
        if (isOverTask) {
          const overIssueIndex = overCol.issues.findIndex((i) => i.id === overId)
          const isBelow = over.rect && active.rect.current.translated && 
            active.rect.current.translated.top > over.rect.top + over.rect.height / 2
          
          const modifier = isBelow ? 1 : 0
          newIndex = overIssueIndex >= 0 ? overIssueIndex + modifier : overCol.issues.length
        }
        
        const newCols = [...cols]
        newCols[activeColIndex] = {
          ...activeCol,
          issues: activeCol.issues.filter((i) => i.id !== activeId)
        }
        const newIssues = [...overCol.issues]
        if (issueToMove) {
          newIssues.splice(newIndex, 0, { ...issueToMove, status: overCol.key })
        }
        newCols[overColIndex] = {
          ...overCol,
          issues: newIssues
        }
        
        return newCols
      }

      return cols
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIssue(null)
    const { active, over } = event
    
    if (!over) return

    const activeId = active.id
    const overId = over.id

    if (activeId === overId) return
    
    setColumns((cols) => {
      const activeColIndex = cols.findIndex((col) => col.issues.some((i) => i.id === activeId))
      let overColIndex = cols.findIndex((col) => col.issues.some((i) => i.id === overId))
      
      if (overColIndex === -1) {
         overColIndex = cols.findIndex(c => c.key === overId)
      }
      
      if (activeColIndex === -1 || overColIndex === -1) return cols
      
      const activeCol = cols[activeColIndex]
      const overCol = cols[overColIndex]

      if (!activeCol || !overCol) return cols

      if (activeColIndex === overColIndex) {
        const oldIndex = activeCol.issues.findIndex((i) => i.id === activeId)
        const newIndex = overCol.issues.findIndex((i) => i.id === overId)
        
        const newIssues = arrayMove(activeCol.issues, oldIndex, newIndex)
        
        let newOrder: number = Date.now()
        if (newIndex === 0) {
          newOrder = (newIssues[1]?.order ?? Date.now()) - 1000
        } else if (newIndex === newIssues.length - 1) {
          const prevIssue = newIssues[newIndex - 1]
          newOrder = (prevIssue ? prevIssue.order : Date.now()) + 1000
        } else {
          const prevIssue = newIssues[newIndex - 1]
          const nextIssue = newIssues[newIndex + 1]
          if (prevIssue && nextIssue) {
            newOrder = (prevIssue.order + nextIssue.order) / 2
          }
        }
        
        const movedIssue = newIssues[newIndex]
        if (movedIssue) {
          newIssues[newIndex] = { ...movedIssue, order: newOrder }
        }
        
        const newCols = [...cols]
        newCols[activeColIndex] = { ...activeCol, issues: newIssues }
        
        onDragEnd(activeId as string, activeCol.key, newOrder)
        
        return newCols
      } else {
        // Handle cross-column drop in end event too if over didn't catch it
        // Or just let over handle it, but we need to trigger API call
        const activeIssueIndex = activeCol.issues.findIndex((i) => i.id === activeId)
        const movedIssue = activeCol.issues[activeIssueIndex]
        if (movedIssue) {
            onDragEnd(activeId as string, overCol.key, movedIssue.order)
        }
      }

      return cols
    })
  }

  const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {columns.map((column) => (
          <KanbanColumn
            key={column.key}
            column={column}
            onIssueClick={onIssueClick}
            onCreateIssue={onCreateIssue}
          />
        ))}
      </div>
      
      <DragOverlay dropAnimation={dropAnimation}>
        {activeIssue ? <KanbanCard issue={activeIssue} onClick={() => {}} isOverlay /> : null}
      </DragOverlay>
    </DndContext>
  )
}
