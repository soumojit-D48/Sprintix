'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { Loader2, Trash2, AlertTriangle } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { UploadButton } from '@/hooks/use-upload'
import { useCurrentMember } from '@/hooks/use-current-member'
import { toast } from 'sonner'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function GeneralSettingsPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const router = useRouter()
  const { isOwner } = useCurrentMember()

  const { data: workspace, isLoading } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [slugError, setSlugError] = useState('')
  const [initialized, setInitialized] = useState(false)

  const utils = trpc.useUtils()

  useEffect(() => {
    if (workspace && !initialized) {
      setName(workspace.name)
      setSlug(workspace.slug)
      setLogoUrl(workspace.logoUrl ?? null)
      setInitialized(true)
    }
  }, [workspace, initialized])

  const updateWorkspace = trpc.workspace.update.useMutation({
    onSuccess: (data) => {
      toast.success('Workspace updated successfully')
      if (data.slug !== workspace?.slug) {
        router.push(`/${data.slug}/settings`)
      }
      utils.workspace.getUserWorkspaces.invalidate()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const deleteWorkspace = trpc.workspace.delete.useMutation({
    onSuccess: () => {
      toast.success('Workspace deleted')
      router.push('/onboarding')
    },
    onError: (error) => {
      toast.error(error.message)
      setDeleteOpen(false)
      setDeleteConfirm('')
    },
  })

  if (isLoading || !workspace) {
    return (
      <main className="bg-background flex-1 overflow-auto">
        <div className="container mx-auto max-w-2xl px-6 py-8">
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Loading...
          </div>
        </div>
      </main>
    )
  }

  const handleNameChange = (newName: string) => {
    setName(newName)
    if (!slugError) {
      setSlug(generateSlug(newName))
    }
  }

  const handleSave = () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Name and URL are required')
      return
    }
    updateWorkspace.mutate({
      workspaceId: workspace.id,
      name: name.trim(),
      slug: slug.trim(),
      logoUrl: logoUrl,
    })
  }

  const handleDelete = () => {
    if (deleteConfirm !== workspace.name) {
      toast.error('Workspace name does not match')
      return
    }
    deleteWorkspace.mutate({ workspaceId: workspace.id })
  }

  const hasChanges = name !== workspace.name || slug !== workspace.slug || logoUrl !== (workspace.logoUrl ?? null)

  return (
    <main className="flex-1 overflow-auto">
      <div className="container mx-auto max-w-2xl px-6 py-8">
        <h1 className="mb-8 text-2xl font-bold">General Settings</h1>

        {/* Workspace Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Workspace Info</CardTitle>
            <CardDescription>Manage your workspace name, URL, and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Workspace Logo</Label>
              <div className="flex items-center gap-4">
                <Avatar size="lg">
                  <AvatarImage src={logoUrl ?? ''} />
                  <AvatarFallback className="text-lg">
                    {(workspace.name ?? 'W').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <UploadButton
                    endpoint="workspaceLogo"
                    onClientUploadComplete={(res) => {
                      if (res?.[0]) {
                        setLogoUrl(res[0].url)
                        toast.success('Logo uploaded')
                      }
                    }}
                    onUploadError={(error) => {
                      toast.error(error.message)
                    }}
                  />
                  {logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Company"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Workspace URL</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">sprintix.com/</span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(generateSlug(e.target.value))
                    setSlugError('')
                  }}
                  className={slugError ? 'border-destructive' : ''}
                  placeholder="my-company"
                />
              </div>
              {slugError && <p className="text-destructive text-xs">{slugError}</p>}
            </div>

            <div className="pt-2">
              <Button onClick={handleSave} disabled={!hasChanges || updateWorkspace.isPending}>
                {updateWorkspace.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Plan Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Plan</CardTitle>
            <CardDescription>Your current subscription plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{workspace.plan}</p>
                <p className="text-muted-foreground text-sm">
                  Created on {new Date(workspace.createdAt).toLocaleDateString()}
                </p>
              </div>
              {workspace.plan === 'FREE' && (
                <Button variant="outline" size="sm">
                  Upgrade to Pro
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {isOwner && (
          <Card id="danger-zone" className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Delete Workspace</p>
                  <p className="text-muted-foreground text-sm">
                    Once you delete a workspace, there is no going back.
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive size-5" />
                Delete Workspace
              </DialogTitle>
              <DialogDescription>
                This will permanently delete the workspace and all its data including projects,
                issues, and conversations. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="confirm">
                Type <span className="font-mono font-medium">{workspace.name}</span> to confirm
              </Label>
              <Input
                id="confirm"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Enter workspace name"
                className="mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirm !== workspace.name || deleteWorkspace.isPending}
              >
                {deleteWorkspace.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Delete Workspace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
