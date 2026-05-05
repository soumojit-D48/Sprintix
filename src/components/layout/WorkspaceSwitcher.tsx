'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { useWorkspaceStore } from '@/stores/workspace-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Workspace {
  id: string
  name: string
  slug: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
}

export function WorkspaceSwitcher({ workspaces, currentWorkspace }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setActiveWorkspace } = useWorkspaceStore()

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setActiveWorkspace(workspace)
    setOpen(false)
    router.push(`/${workspace.slug}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between px-2 font-normal">
          <div className="flex items-center gap-2">
            <Avatar size="sm">
              <AvatarImage src="" />
              <AvatarFallback>
                {currentWorkspace?.name.charAt(0).toUpperCase() || 'W'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {currentWorkspace?.name || 'Select workspace'}
            </span>
          </div>
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <div className="space-y-1">
          <div className="text-muted-foreground px-2 py-1.5 text-xs font-medium">Workspaces</div>
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => handleWorkspaceSelect(workspace)}
              className={cn(
                'hover:bg-muted flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                currentWorkspace?.id === workspace.id && 'bg-muted'
              )}
            >
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarImage src="" />
                  <AvatarFallback>{workspace.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="truncate">{workspace.name}</span>
              </div>
              {currentWorkspace?.id === workspace.id && (
                <Check className="text-muted-foreground size-4" />
              )}
            </button>
          ))}
          <div className="mt-1 border-t pt-1">
            <Link
              href="/onboarding"
              onClick={() => setOpen(false)}
              className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
            >
              <Plus className="size-4" />
              <span>Create new workspace</span>
            </Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
