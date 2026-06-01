'use client'

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import { useMemo } from 'react'
import { ChartWrapper } from './ChartWrapper'

interface BurndownDataPoint {
  date: string
  ideal: number
  actual: number
}

interface BurndownChartProps {
  data: BurndownDataPoint[]
  isLoading?: boolean
  title?: string
  description?: string
}

export function BurndownChart({
  data,
  isLoading,
  title = 'Burndown',
  description = 'Daily remaining issues vs ideal trend',
}: BurndownChartProps) {
  const chartData = useMemo(() => {
    return data.map((d) => ({
      ...d,
      date: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }))
  }, [data])

  return (
    <ChartWrapper
      title={title}
      description={description}
      isLoading={isLoading ?? false}
      isEmpty={chartData.length === 0}
      emptyMessage="No burndown data available yet."
    >
      <div className="w-full">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="plainline"
            />
            <Line
              type="monotone"
              dataKey="ideal"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              dot={false}
              name="Ideal"
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary) / 0.1)"
              strokeWidth={2}
              name="Actual"
              dot={{ r: 3, strokeWidth: 1.5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
