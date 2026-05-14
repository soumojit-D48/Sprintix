'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { useUIStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useWorkspaceStore } from '@/stores/workspace-store'

interface Workspace {
  id: string
  name: string
  slug: string
}

interface WorkspaceSwitcherProps {
  workspaces: Workspace[]
  currentWorkspace: Workspace | null
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function WorkspaceSwitcher({ workspaces, currentWorkspace }: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [newWorkspaceSlug, setNewWorkspaceSlug] = useState('')
  const [slugError, setSlugError] = useState('')
  const router = useRouter()
  const { setActiveWorkspace } = useWorkspaceStore()

  const createWorkspace = trpc.workspace.create.useMutation({
    onSuccess: (data) => {
      setCreateOpen(false)
      setNewWorkspaceName('')
      setNewWorkspaceSlug('')
      setSlugError('')
      router.push(`/${data.slug}`)
    },
    onError: (error) => {
      setSlugError(error.message)
    },
  })

  const handleWorkspaceSelect = (workspace: Workspace) => {
    setActiveWorkspace(workspace)
    setOpen(false)
    router.push(`/${workspace.slug}`)
  }

  const handleNameChange = (name: string) => {
    setNewWorkspaceName(name)
    setNewWorkspaceSlug(generateSlug(name))
    setSlugError('')
  }

  const handleCreateSubmit = () => {
    if (!newWorkspaceName.trim() || !newWorkspaceSlug.trim()) return
    createWorkspace.mutate({ name: newWorkspaceName, slug: newWorkspaceSlug })
  }

  return (
    <>
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
              <button
                onClick={() => {
                  setOpen(false)
                  setCreateOpen(true)
                }}
                className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
              >
                <Plus className="size-4" />
                <span>Create new workspace</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace Name</label>
              <Input
                placeholder="My Company"
                value={newWorkspaceName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Workspace URL</label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">sprintix.com/</span>
                <Input
                  placeholder="my-company"
                  value={newWorkspaceSlug}
                  onChange={(e) => {
                    setNewWorkspaceSlug(generateSlug(e.target.value))
                    setSlugError('')
                  }}
                  className={slugError ? 'border-destructive' : ''}
                />
              </div>
              {slugError && <p className="text-destructive text-xs">{slugError}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                !newWorkspaceName.trim() || !newWorkspaceSlug.trim() || createWorkspace.isPending
              }
            >
              {createWorkspace.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Create Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

import { ChevronDown, Check } from 'lucide-react'
