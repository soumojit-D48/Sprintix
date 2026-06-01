'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface ChartWrapperProps {
  title: string
  description?: string
  isLoading?: boolean
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}



export function ChartWrapper({
  title,
  description,
  isLoading,
  isEmpty,
  emptyMessage = 'No data available yet.',
  children,
  className,
  action,
}: ChartWrapperProps) {
  if (isLoading) {
    return (
      <Card className={cn('border-border/50 bg-card/50', className)}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          {description && <Skeleton className="h-3 w-60" />}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full rounded-lg" />
        </CardContent>
      </Card>
    )
  }

  if (isEmpty) {
    return (
      <Card className={cn('border-border/50 bg-card/50', className)}>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-40 items-center justify-center text-sm">
            {emptyMessage}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border-border/50 bg-card/50', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-0.5">{description}</CardDescription>
          )}
        </div>
        {action && <div className="ml-4 shrink-0">{action}</div>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
