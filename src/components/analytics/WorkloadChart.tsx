'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { ChartWrapper } from './ChartWrapper'

interface WorkloadItem {
  userId: string
  name: string
  avatarUrl: string | null
  openCount: number
  inProgressCount: number
  overdueCount: number
}

interface WorkloadChartProps {
  data: WorkloadItem[]
  isLoading?: boolean
}

export function WorkloadChart({ data, isLoading }: WorkloadChartProps) {
  const chartData = data.map((d) => ({
    name: d.name.split(' ')[0] ?? d.name,
    Open: d.openCount,
    'In Progress': d.inProgressCount,
    Overdue: d.overdueCount,
  }))

  return (
    <ChartWrapper
      title="Team Workload"
      description="Open, in-progress, and overdue issues per member"
      isLoading={isLoading ?? false}
      isEmpty={data.length === 0}
      emptyMessage="No team workload data available."
    >
      <div className="w-full">
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 50)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              horizontal={false}
            />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
              }}
            />
            <Bar
              dataKey="Open"
              stackId="a"
              fill="hsl(var(--primary))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="In Progress"
              stackId="a"
              fill="hsl(var(--chart-2, 215 70% 55%))"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="Overdue"
              stackId="a"
              fill="hsl(var(--destructive))"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
