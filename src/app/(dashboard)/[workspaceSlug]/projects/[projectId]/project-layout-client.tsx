'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LayoutPanelTop, List, CalendarRange, Archive, GitFork, Settings, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface ProjectData {
  id: string
  name: string
  identifier: string
  color: string
  status: string
  lead: { id: string; name: string; avatarUrl: string | null } | null
  progress: number
  totalIssueCount: number
}

interface ActiveSprint {
  id: string
  name: string
  status: string
}

const statusBadge: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  PAUSED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  ARCHIVED: 'bg-gray-100 text-gray-700 border-gray-200',
  COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
}

const tabs = [
  { label: 'Board', href: 'board', icon: LayoutPanelTop },
  { label: 'List', href: 'list', icon: List },
  { label: 'Timeline', href: 'timeline', icon: CalendarRange },
  { label: 'Backlog', href: 'backlog', icon: Archive },
  { label: 'Sprints', href: 'sprints', icon: GitFork },
  { label: 'Settings', href: 'settings', icon: Settings },
]

export function ProjectLayoutClient({
  project,
  activeSprint,
  workspaceSlug,
  children,
}: {
  project: ProjectData
  activeSprint: ActiveSprint | null
  workspaceSlug: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const currentTab = pathname.split('/').pop() ?? 'board'

  return (
    <div className="flex h-full flex-col">
      <div className="border-b">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-9 items-center justify-center rounded-lg text-base font-bold text-white"
                style={{ backgroundColor: project.color }}
              >
                {project.identifier.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg leading-tight font-semibold">{project.name}</h1>
                  <Badge
                    variant="outline"
                    className={cn('font-mono text-xs', statusBadge[project.status] || '')}
                  >
                    {project.identifier}
                  </Badge>
                  <Badge variant="outline" className={statusBadge[project.status] || ''}>
                    {project.status.charAt(0) + project.status.slice(1).toLowerCase()}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  {project.lead && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="size-4">
                        <AvatarImage src={project.lead.avatarUrl ?? ''} />
                        <AvatarFallback className="text-[9px]">
                          {project.lead.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{project.lead.name}</span>
                    </div>
                  )}
                  <span>
                    {project.totalIssueCount} issue{project.totalIssueCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Progress value={project.progress} className="h-1.5 w-16" />
                    {project.progress}%
                  </span>
                </div>
              </div>
            </div>

            {activeSprint && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <span className="size-1.5 rounded-full bg-green-500" />
                  {activeSprint.name}
                </Badge>
              </div>
            )}
          </div>

          <div className="flex gap-1">
            {tabs.map((tab) => {
              const isActive = currentTab === tab.href
              const href = `/${workspaceSlug}/projects/${project.id}/${tab.href}`
              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'border-primary text-foreground'
                      : 'text-muted-foreground hover:text-foreground border-transparent'
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
