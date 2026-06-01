'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ChartWrapper } from './ChartWrapper'

interface StatusItem {
  status: string
  count: number
}

interface IssuesByStatusChartProps {
  data: StatusItem[]
  isLoading?: boolean
}

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: 'hsl(var(--muted-foreground))',
  TODO: 'hsl(220 20% 55%)',
  IN_PROGRESS: 'hsl(215 70% 55%)',
  IN_REVIEW: 'hsl(275 70% 55%)',
  DONE: 'hsl(142 70% 45%)',
  CANCELLED: 'hsl(0 70% 50%)',
}

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: 'Backlog',
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
}

export function IssuesByStatusChart({ data, isLoading }: IssuesByStatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  const chartData = data.filter((d) => d.count > 0)

  return (
    <ChartWrapper
      title="Issues by Status"
      description={`${total} total issues`}
      isLoading={isLoading ?? false}
      isEmpty={chartData.length === 0}
      emptyMessage="No issues found."
    >
      <div className="w-full">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={chartData.map((d) => ({
                ...d,
                label: STATUS_LABELS[d.status] ?? d.status,
              }))}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? 'hsl(var(--muted-foreground))'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid hsl(var(--border))',
              }}
              formatter={(value, name) => [
                `${value} (${total > 0 ? Math.round((Number(value) / total) * 100) : 0}%)`,
                name,
              ]}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="circle"
              formatter={(value: string) => value}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartWrapper>
  )
}
