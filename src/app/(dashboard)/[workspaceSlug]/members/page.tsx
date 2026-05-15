'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, Mail, MoreHorizontal, Search, Trash2, UserMinus, RefreshCw } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MemberInviteModal } from '@/components/members/MemberInviteModal'
import { useCurrentMember } from '@/hooks/use-current-member'
import { toast } from 'sonner'

const roleColors: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  ADMIN: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-green-100 text-green-700',
  VIEWER: 'bg-gray-100 text-gray-700',
}

export default function MembersPage() {
  const params = useParams()
  const workspaceSlug = params.workspaceSlug as string
  const { canManageMembers, canInvite } = useCurrentMember()
  const [search, setSearch] = useState('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)

  const { data: workspace } = trpc.workspace.getBySlug.useQuery({ slug: workspaceSlug })
  const utils = trpc.useUtils()

  const { data: members, isLoading: membersLoading } = trpc.member.list.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id }
  )

  const { data: invites, isLoading: invitesLoading } = trpc.member.getPendingInvites.useQuery(
    { workspaceId: workspace?.id ?? '' },
    { enabled: !!workspace?.id && canManageMembers }
  )

  const updateRoleMutation = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate()
      toast.success('Role updated successfully')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const removeMemberMutation = trpc.member.remove.useMutation({
    onSuccess: () => {
      utils.member.list.invalidate()
      setRemoveDialogOpen(false)
      setMemberToRemove(null)
      toast.success('Member removed successfully')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const resendInviteMutation = trpc.member.resendInvite.useMutation({
    onSuccess: () => {
      utils.member.getPendingInvites.invalidate()
      toast.success('Invite resent')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const cancelInviteMutation = trpc.member.cancelInvite.useMutation({
    onSuccess: () => {
      utils.member.getPendingInvites.invalidate()
      toast.success('Invite cancelled')
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const filteredMembers = members?.filter(
    (m) =>
      m.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase())
  )

  const handleRoleChange = (memberId: string, newRole: string) => {
    if (!workspace?.id) return
    updateRoleMutation.mutate({
      workspaceId: workspace.id,
      memberId,
      role: newRole as 'VIEWER' | 'MEMBER' | 'ADMIN',
    })
  }

  const handleRemove = () => {
    if (!workspace?.id || !memberToRemove) return
    removeMemberMutation.mutate({
      workspaceId: workspace.id,
      memberId: memberToRemove.id,
    })
  }

  if (!workspace) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <main className="bg-background flex-1 overflow-auto">
      <div className="container mx-auto max-w-5xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Members</h1>
            <p className="text-muted-foreground">Manage workspace members and invitations</p>
          </div>
          {canInvite && (
            <>
              <MemberInviteModal
                open={inviteModalOpen}
                onOpenChange={setInviteModalOpen}
                workspaceId={workspace.id}
              />
              <Button onClick={() => setInviteModalOpen(true)}>
                <Mail className="mr-2 size-4" />
                Invite Members
              </Button>
            </>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pending Invites */}
        {canManageMembers && invites && invites.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">Pending Invites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitesLoading ? (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading invites...
                  </div>
                ) : (
                  invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary flex h-9 w-9 items-center justify-center rounded-full">
                          <Mail className="size-4" />
                        </div>
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <p className="text-muted-foreground text-sm">
                            Role: {invite.role} · Expires:{' '}
                            {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInviteMutation.mutate({ inviteId: invite.id })}
                          disabled={resendInviteMutation.isPending}
                        >
                          <RefreshCw className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelInviteMutation.mutate({ inviteId: invite.id })}
                          disabled={cancelInviteMutation.isPending}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Members ({filteredMembers?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" />
                Loading members...
              </div>
            ) : filteredMembers?.length === 0 ? (
              <p className="text-muted-foreground py-4 text-center">No members found</p>
            ) : (
              <div className="space-y-2">
                {filteredMembers?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.user.avatarUrl ?? ''} />
                        <AvatarFallback>
                          {(member.user.name ?? 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.user.name}</p>
                        <p className="text-muted-foreground text-sm">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={roleColors[member.role] || ''}>{member.role}</Badge>
                      {canManageMembers && member.role !== 'OWNER' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-sm font-medium">Change Role</div>
                            {(['VIEWER', 'MEMBER', 'ADMIN'] as const).map((r) => (
                              <DropdownMenuItem
                                key={r}
                                onClick={() => handleRoleChange(member.id, r)}
                                disabled={member.role === r}
                              >
                                {r}
                              </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                setMemberToRemove({ id: member.id, name: member.user.name ?? '' })
                                setRemoveDialogOpen(true)
                              }}
                            >
                              <UserMinus className="mr-2 size-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remove Member Dialog */}
        <Dialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Member</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {memberToRemove?.name} from this workspace? They
                will lose access to all workspace resources.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRemove}
                disabled={removeMemberMutation.isPending}
              >
                {removeMemberMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
