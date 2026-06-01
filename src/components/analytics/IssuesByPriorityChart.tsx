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

interface PriorityItem {
  priority: string
  count: number
}

interface IssuesByPriorityChartProps {
  data: PriorityItem[]
  isLoading?: boolean
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'hsl(var(--destructive))',
  HIGH: 'hsl(20 80% 55%)',
  MEDIUM: 'hsl(215 70% 55%)',
  LOW: 'hsl(220 20% 55%)',
  NO_PRIORITY: 'hsl(var(--muted-foreground))',
}

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  NO_PRIORITY: 'No Priority',
}

export function IssuesByPriorityChart({ data, isLoading }: IssuesByPriorityChartProps) {
  const chartData = data.filter((d) => d.count > 0)

  return (
    <ChartWrapper
      title="Issues by Priority"
      description="Distribution of issues by priority level"
      isLoading={isLoading ?? false}
      isEmpty={chartData.length === 0}
      emptyMessage="No issues found."
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
              dataKey="priority"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val: string) => PRIORITY_LABELS[val] ?? val}
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
              labelFormatter={(label) => PRIORITY_LABELS[String(label)] ?? label}
            />
            <Bar dataKey="count" name="Issues" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.priority}
                  fill={PRIORITY_COLORS[entry.priority] ?? 'hsl(var(--muted-foreground))'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
