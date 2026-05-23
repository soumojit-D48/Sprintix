'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { trpc } from '@/lib/trpc/provider'

interface DmCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspaceSlug: string
}

export function DmCreateDialog({ open, onOpenChange, workspaceId, workspaceSlug }: DmCreateDialogProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const utils = trpc.useUtils()

  const { data: members, isLoading } = trpc.member.list.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  )

  const { data: currentMember } = trpc.member.getCurrentMember.useQuery(
    { workspaceId },
    { enabled: !!workspaceId }
  )

  const createDm = trpc.channel.createDm.useMutation({
    onSuccess: (channel) => {
      utils.channel.listDms.invalidate({ workspaceId })
      utils.channel.list.invalidate({ workspaceId })
      onOpenChange(false)
      setSearch('')
      router.push(`/${workspaceSlug}/chat/${channel.id}`)
    },
    onError: (err) => {
      toast.error(err.message)
    },
  })

  const currentUserId = currentMember?.user?.id

  const filteredMembers = members?.filter(
    (m) =>
      m.userId !== currentUserId &&
      (m.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        m.user.email.toLowerCase().includes(search.toLowerCase()))
  )

  const handleStartDm = (participantId: string) => {
    createDm.mutate({ workspaceId, participantId })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Select a member to start a direct message.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        <ScrollArea className="max-h-72">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMembers?.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">No members found</p>
          ) : (
            <div className="space-y-0.5 py-2">
              {filteredMembers?.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStartDm(member.userId)}
                  disabled={createDm.isPending}
                  className="hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                >
                  <Avatar className="size-9">
                    <AvatarImage src={member.user.avatarUrl ?? ''} alt={member.user.name ?? ''} />
                    <AvatarFallback>
                      {(member.user.name ?? 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{member.user.name}</p>
                    <p className="text-muted-foreground truncate text-xs">{member.user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
