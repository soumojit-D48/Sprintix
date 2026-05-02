'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc/provider'

export function Step2InviteTeammates() {
  const router = useRouter()
  const [emails, setEmails] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const utils = trpc.useUtils()

  const getWorkspace = trpc.workspace.getUserWorkspaces.useQuery()

  const inviteMembers = trpc.workspace.inviteMembers.useMutation({
    onSuccess: () => {
      setSuccess(true)
      utils.workspace.getUserWorkspaces.invalidate()
      setTimeout(() => {
        router.push('/onboarding?step=3')
      }, 1500)
    },
    onError: (err) => {
      setError(err.message)
    },
  })

  const workspace = getWorkspace.data?.[0]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const emailList = emails
      .split(/[\n,]+/)
      .map((email) => email.trim())
      .filter((email) => email)

    if (emailList.length === 0) {
      setError('Please enter at least one email')
      return
    }

    if (!workspace) {
      setError('No workspace found')
      return
    }

    setError('')
    inviteMembers.mutate({
      workspaceId: workspace.id,
      emails: emailList,
    })
  }

  const handleSkip = () => {
    router.push('/onboarding?step=3')
  }

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold">Invite your team</h2>
          <p className="mt-2 text-gray-600">
            Collaborate with your team from day one. Skip if you&apos;re flying solo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email Addresses</label>
            <textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="colleague@example.com&#10;another@example.com"
              rows={4}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Separate multiple emails with commas or new lines
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">Invitations sent! Redirecting...</p>}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={inviteMembers.isPending}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {inviteMembers.isPending ? 'Sending...' : 'Send Invites'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Skip for now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
