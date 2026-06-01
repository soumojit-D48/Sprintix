'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: number | string
  icon?: ReactNode
  trend?: number
  trendLabel?: string
  isLoading?: boolean
  className?: string
}

export function StatCard({
  title,
  value,
  icon,
  trend,
  trendLabel,
  isLoading,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn('border-border/50 bg-card/50', className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-4" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-1 h-3 w-20" />
        </CardContent>
      </Card>
    )
  }

  const isPositive = trend !== undefined && trend >= 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <Card className={cn('border-border/50 bg-card/50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <div className="mt-1 flex items-center gap-1">
            {isPositive ? (
              <TrendingUp className="size-3 text-green-500" />
            ) : isNegative ? (
              <TrendingDown className="size-3 text-red-500" />
            ) : null}
            <span
              className={cn(
                'text-xs font-medium',
                isPositive && 'text-green-500',
                isNegative && 'text-red-500',
                trend === 0 && 'text-muted-foreground'
              )}
            >
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
            {trendLabel && (
              <span className="text-muted-foreground text-xs">{trendLabel}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
