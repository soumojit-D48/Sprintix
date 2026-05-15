'use client'

import { useState } from 'react'
import { Loader2, Mail, X, Check } from 'lucide-react'
import { trpc } from '@/lib/trpc/provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useCurrentMember } from '@/hooks/use-current-member'

interface InviteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
}

export function MemberInviteModal({ open, onOpenChange, workspaceId }: InviteModalProps) {
  const { canInvite } = useCurrentMember()
  const [emailInput, setEmailInput] = useState('')
  const [role, setRole] = useState<'VIEWER' | 'MEMBER' | 'ADMIN'>('MEMBER')
  const [emailList, setEmailList] = useState<string[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const utils = trpc.useUtils()

  const inviteMutation = trpc.member.invite.useMutation({
    onSuccess: () => {
      setSuccess(true)
      setEmailInput('')
      setEmailList([])
      setRole('MEMBER')
      utils.member.getPendingInvites.invalidate()
      toast.success('Invites sent successfully')
      setTimeout(() => {
        setSuccess(false)
        onOpenChange(false)
      }, 2000)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const handleAddEmail = () => {
    const email = emailInput.trim().toLowerCase()
    if (!email) return

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Invalid email format')
      return
    }

    // Check if already added
    if (emailList.includes(email)) {
      setError('Email already added')
      return
    }

    setEmailList([...emailList, email])
    setEmailInput('')
    setError('')
  }

  const handleRemoveEmail = (email: string) => {
    setEmailList(emailList.filter((e) => e !== email))
  }

  const handleInvite = () => {
    const allEmails = emailInput ? [...emailList, emailInput] : emailList
    if (allEmails.length === 0) {
      setError('Add at least one email address')
      return
    }

    inviteMutation.mutate({
      workspaceId,
      emails: allEmails,
      role,
    })
  }

  if (!canInvite) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Invite people to your workspace. They will receive an email to join.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-primary/10 rounded-full p-3">
              <Check className="text-primary size-8" />
            </div>
            <p className="mt-4 font-medium">Invites sent successfully!</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label>Email Addresses</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="email@example.com"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                      setError('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEmail()
                      }
                    }}
                  />
                  <Button type="button" variant="secondary" onClick={handleAddEmail}>
                    Add
                  </Button>
                </div>
              </div>

              {/* Email List */}
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailList.map((email) => (
                    <div
                      key={email}
                      className="bg-secondary flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(email)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Role Select */}
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(value: 'VIEWER' | 'MEMBER' | 'ADMIN') => setRole(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEWER">Viewer - Can view only</SelectItem>
                    <SelectItem value="MEMBER">Member - Can contribute</SelectItem>
                    <SelectItem value="ADMIN">Admin - Can manage members</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleInvite}
                disabled={emailList.length === 0 || inviteMutation.isPending}
              >
                {inviteMutation.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Send Invites
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
