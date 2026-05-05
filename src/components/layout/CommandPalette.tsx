'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUIStore } from '@/stores/ui-store'
import { Command } from 'cmdk'
import { Search, FolderKanban, User, Settings, Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  title: string
  type: 'project' | 'issue' | 'member' | 'action'
  icon?: React.ElementType
  href?: string
}

interface CommandPaletteProps {
  projects: { id: string; name: string; identifier: string }[]
  workspaceSlug: string
}

export function CommandPalette({ projects, workspaceSlug }: CommandPaletteProps) {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [commandPaletteOpen, setCommandPaletteOpen])

  const handleSelect = (href: string) => {
    setCommandPaletteOpen(false)
    router.push(href)
  }

  const actions = [
    {
      id: 'create-issue',
      title: 'Create issue',
      icon: Plus,
      href: `/${workspaceSlug}/projects/new`,
    },
    {
      id: 'create-project',
      title: 'Create project',
      icon: Plus,
      href: `/${workspaceSlug}/projects/new`,
    },
    {
      id: 'invite-member',
      title: 'Invite member',
      icon: User,
      href: `/${workspaceSlug}/members/invite`,
    },
  ]

  const filteredActions = actions.filter((action) =>
    action.title.toLowerCase().includes(query.toLowerCase())
  )

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(query.toLowerCase()) ||
      project.identifier.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <Dialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <DialogContent className="overflow-hidden p-0">
        <Command className="w-full" shouldFilter={true}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 size-4 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search projects, issues, or commands..."
              className="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-x-hidden overflow-y-auto p-2">
            <Command.Empty className="text-muted-foreground py-6 text-center text-sm">
              No results found.
            </Command.Empty>

            <Command.Group
              heading="Quick Actions"
              className="text-muted-foreground mb-2 text-xs font-medium"
            >
              {filteredActions.map((action) => (
                <Command.Item
                  key={action.id}
                  value={action.title}
                  onSelect={() => handleSelect(action.href!)}
                  className="aria-selected:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <action.icon className="size-4" />
                  <span>{action.title}</span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Projects"
              className="text-muted-foreground mb-2 text-xs font-medium"
            >
              {filteredProjects.map((project) => (
                <Command.Item
                  key={project.id}
                  value={`${project.name} ${project.identifier}`}
                  onSelect={() => handleSelect(`/${workspaceSlug}/projects/${project.id}`)}
                  className="aria-selected:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
                >
                  <FolderKanban className="size-4" />
                  <span>{project.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {project.identifier}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading="Navigation"
              className="text-muted-foreground mb-2 text-xs font-medium"
            >
              <Command.Item
                value="dashboard"
                onSelect={() => handleSelect(`/${workspaceSlug}`)}
                className="aria-selected:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <FolderKanban className="size-4" />
                <span>Dashboard</span>
              </Command.Item>
              <Command.Item
                value="members"
                onSelect={() => handleSelect(`/${workspaceSlug}/members`)}
                className="aria-selected:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <User className="size-4" />
                <span>Members</span>
              </Command.Item>
              <Command.Item
                value="settings"
                onSelect={() => handleSelect(`/${workspaceSlug}/settings`)}
                className="aria-selected:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Settings className="size-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
