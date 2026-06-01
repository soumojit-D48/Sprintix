'use client'

import Link from 'next/link'
import { AlertCircle, ChevronRight, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface OverdueIssue {
  id: string
  identifier: string
  title: string
  status: string
  priority: string
  dueDate: Date
  daysOverdue: number
  assignee: { id: string; name: string; avatarUrl: string | null } | null
  project: { id: string; name: string; identifier: string; color: string | null }
}

interface OverdueIssuesListProps {
  data: OverdueIssue[]
  workspaceSlug: string
  isLoading?: boolean
}

export function OverdueIssuesList({
  data,
  workspaceSlug,
  isLoading,
}: OverdueIssuesListProps) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 text-red-500" />
            Overdue Issues
            {data.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {data.length}
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center py-6 text-sm">
            <AlertCircle className="mb-2 size-8 opacity-40" />
            No overdue issues. Great job!
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((issue) => (
              <Link
                key={issue.id}
                href={`/${workspaceSlug}/issues/${issue.id}`}
                className="border-border/50 bg-background/30 hover:border-border hover:bg-muted/50 flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
                  style={{ backgroundColor: issue.project.color ?? '#3B82F6' }}
                >
                  {issue.project.identifier.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {issue.identifier} — {issue.title}
                    </span>
                    <Badge variant="destructive" className="shrink-0 text-[10px]">
                      {issue.daysOverdue}d overdue
                    </Badge>
                  </div>
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <span>{issue.project.name}</span>
                    {issue.assignee && (
                      <>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Avatar className="size-4">
                            <AvatarImage src={issue.assignee.avatarUrl ?? ''} />
                            <AvatarFallback className="text-[8px]">
                              {issue.assignee.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span>{issue.assignee.name}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
