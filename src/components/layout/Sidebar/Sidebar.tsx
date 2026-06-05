'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  BarChart3,
  MessageSquare,
  MessageSquareText,
  Settings,
  GitFork,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUIStore } from '@/stores/ui-store'
import { WorkspaceSwitcher } from '@/components/layout/WorkspaceSwitcher'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
}

interface Project {
  id: string
  name: string
  identifier: string
  color: string
}

interface Channel {
  id: string
  name: string
  type: 'PUBLIC' | 'PRIVATE' | 'DM'
  unreadCount?: number
}

interface Workspace {
  id: string
  name: string
  slug: string
}

interface SidebarProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
  projects: Project[]
  channels: Channel[]
}

const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/[workspaceSlug]', icon: LayoutDashboard },
  { title: 'My Issues', href: '/[workspaceSlug]/issues', icon: FolderKanban },
  { title: 'Projects', href: '/[workspaceSlug]/projects', icon: FolderKanban },
  { title: 'Sprints', href: '/[workspaceSlug]/sprints', icon: GitFork },
  { title: 'Chat', href: '/[workspaceSlug]/chat', icon: MessageSquareText },
  { title: 'Members', href: '/[workspaceSlug]/members', icon: Users },
  { title: 'Analytics', href: '/[workspaceSlug]/analytics', icon: BarChart3 },
  { title: 'Settings', href: '/[workspaceSlug]/settings', icon: BarChart3 },
]

export function Sidebar({ workspaces, currentWorkspace, projects, channels }: SidebarProps) {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebarCollapsed } = useUIStore()
  const [projectsOpen, setProjectsOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)

  const isActive = (href: string) => {
    if (href.includes('[workspaceSlug]')) {
      const base = `/${currentWorkspace?.slug}`
      return pathname === base || pathname.startsWith(base + '/')
    }
    return pathname.startsWith(href.replace('[workspaceSlug]', currentWorkspace?.slug || ''))
  }

  const workspaceBase = `/${currentWorkspace?.slug || ''}`

  if (sidebarCollapsed) {
    return (
      <aside className="bg-background flex h-full w-[56px] flex-col border-r">
        <div className="flex h-12 items-center justify-center border-b">
          <Button variant="ghost" size="icon" onClick={toggleSidebarCollapsed} className="size-8">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </aside>
    )
  }

  return (
    <aside className="bg-background flex h-full w-64 flex-col border-r">
      <div className="flex h-12 items-center justify-between border-b px-3">
        <WorkspaceSwitcher workspaces={workspaces} currentWorkspace={currentWorkspace} />
        <Button variant="ghost" size="icon" onClick={toggleSidebarCollapsed} className="size-7">
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          <nav className="space-y-0.5">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href.replace('[workspaceSlug]', currentWorkspace?.slug || '')}
                className={cn(
                  'hover:bg-muted flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  isActive(item.href) && 'bg-muted font-medium'
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span>{item.title}</span>
              </Link>
            ))}
          </nav>

          <Separator />

          <div>
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-2.5 py-1 text-xs font-medium"
            >
              <span>PROJECTS</span>
              <span className="text-xs">{projects.length}</span>
            </button>
            {projectsOpen && (
              <div className="mt-1 space-y-0.5">
                {projects.slice(0, 8).map((project) => (
                  <Link
                    key={project.id}
                    href={`${workspaceBase}/projects/${project.id}`}
                    className={cn(
                      'hover:bg-muted flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                      pathname.includes(`/projects/${project.id}`) && 'bg-muted'
                    )}
                  >
                    <div
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
                {projects.length > 8 && (
                  <Link
                    href={`${workspaceBase}/projects`}
                    className="text-muted-foreground hover:text-foreground block px-2.5 py-1 text-xs"
                  >
                    See all ({projects.length})
                  </Link>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div>
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="text-muted-foreground hover:text-foreground flex w-full items-center justify-between px-2.5 py-1 text-xs font-medium"
            >
              <span>CHAT</span>
              <span className="text-xs">{channels.length}</span>
            </button>
            {chatOpen && (
              <div className="mt-1 space-y-0.5">
                {channels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`${workspaceBase}/chat/${channel.id}`}
                    className={cn(
                      'hover:bg-muted flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors',
                      pathname.includes(`/chat/${channel.id}`) && 'bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="size-4" />
                      <span className="truncate">{channel.name}</span>
                    </div>
                    {channel.unreadCount ? (
                      <span className="bg-primary text-primary-foreground flex size-5 items-center justify-center rounded-full text-[10px]">
                        {channel.unreadCount}
                      </span>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <Avatar size="sm">
            <AvatarImage src="" />
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <div className="truncate text-sm font-medium">User</div>
            <div className="text-muted-foreground text-xs">Free</div>
          </div>
          <Link href={`${workspaceBase}/settings`}>
            <Button variant="ghost" size="icon" className="size-8">
              <Settings className="size-4" />
            </Button>
          </Link>
        </div>
      </div>
    </aside>
  )
}
