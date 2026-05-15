'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Settings, Loader2, Trash2 } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { useCurrentMember } from '@/hooks/use-current-member'

export default function ProjectSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  const workspaceSlug = params.workspaceSlug as string
  const { canManageSettings } = useCurrentMember()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  const utils = trpc.useUtils()

  const { data: project, isLoading } = trpc.project.getById.useQuery({ projectId })

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [leadId, setLeadId] = useState('')
  const [initialized, setInitialized] = useState(false)

  if (project && !initialized) {
    setName(project.name)
    setDescription(project.description ?? '')
    setStatus(project.status)
    setLeadId(project.leadId ?? '')
    setInitialized(true)
  }

  const { data: members } = trpc.member.list.useQuery(
    { workspaceId: project?.workspaceId ?? '' },
    { enabled: !!project?.workspaceId }
  )

  const updateProject = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate()
      toast.success('Project settings updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteProject = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success('Project deleted')
      router.push(`/${workspaceSlug}/projects`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    if (!name.trim()) return
    updateProject.mutate({
      projectId,
      name,
      description: description || null,
      status: status as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'COMPLETED',
      leadId: leadId || null,
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage project configuration and preferences.
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>Update your project name, description, and status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="settings-name">Project Name</Label>
              <Input
                id="settings-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canManageSettings}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="settings-desc">Description</Label>
              <Textarea
                id="settings-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={!canManageSettings}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v)}
                disabled={!canManageSettings}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                  <SelectItem value="ARCHIVED">Archived</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project Lead</Label>
              <Select value={leadId} onValueChange={setLeadId} disabled={!canManageSettings}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead..." />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) => (
                    <SelectItem key={m.id} value={m.userId}>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-5">
                          <AvatarImage src={m.user.avatarUrl ?? ''} />
                          <AvatarFallback className="text-[10px]">
                            {m.user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span>{m.user.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="font-mono">
                {project.identifier}
              </Badge>
              <span className="text-muted-foreground text-xs">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="pt-2">
              <Button onClick={handleSave} disabled={updateProject.isPending || !canManageSettings}>
                {updateProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {canManageSettings && (
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Deleting a project removes all issues, sprints, and associated data. This action
                cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 size-4" />
                Delete Project
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{project.name}</strong> and all of its issues,
              sprints, and attachments. Type the project name to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Type <span className="font-bold">{project.name}</span> to confirm
            </Label>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={project.name}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirm !== project.name || deleteProject.isPending}
              onClick={() => deleteProject.mutate({ projectId })}
            >
              {deleteProject.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
