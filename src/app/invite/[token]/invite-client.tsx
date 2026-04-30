'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface InviteData {
  id: string
  email: string
  role: string
  workspace: {
    id: string
    name: string
    slug: string
  }
}

export function InvitePageClient({ invite, userId }: { invite: InviteData; userId: string }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAccept = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteId: invite.id,
          userId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation')
      }

      router.push(`/${invite.workspace.slug}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold">You&apos;re Invited!</h1>
        <p className="mt-4 text-gray-600">
          {invite.workspace.name} has invited you to join their workspace
        </p>

        <div className="mt-8 rounded-lg border bg-gray-50 p-6">
          <div className="text-sm text-gray-600">
            <p>
              <span className="font-medium">Role:</span> {invite.role.toLowerCase()}
            </p>
          </div>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          onClick={handleAccept}
          disabled={loading}
          className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Accepting...' : 'Accept Invitation'}
        </button>
      </div>
    </div>
  )
}
