'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts'
import { ChartWrapper } from './ChartWrapper'

interface VelocityItem {
  sprintId: string
  sprintName: string
  startDate: Date
  endDate: Date
  totalIssues: number
  completedIssues: number
  cancelledIssues: number
  completionRate: number
}

interface VelocityChartProps {
  data: VelocityItem[]
  averageVelocity: number
  isLoading?: boolean
}

export function VelocityChart({
  data,
  averageVelocity,
  isLoading,
}: VelocityChartProps) {
  const chartData = data.map((d) => ({
    name: d.sprintName.length > 12 ? d.sprintName.slice(0, 12) + '...' : d.sprintName,
    completed: d.completedIssues,
    total: d.totalIssues,
    completionRate: d.completionRate,
  }))

  return (
    <ChartWrapper
      title="Velocity"
      description={`Last ${data.length} sprints · Avg ${averageVelocity} completed per sprint`}
      isLoading={isLoading ?? false}
      isEmpty={data.length === 0}
      emptyMessage="No completed sprints yet."
    >
      <div className="w-full">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
              vertical={false}
            />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
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
              formatter={(value, name) => [
                value,
                name === 'completed' ? 'Completed' : 'Total',
              ]}
            />
            <Bar
              dataKey="completed"
              name="completed"
              radius={[4, 4, 0, 0]}
              fill="hsl(var(--primary))"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
