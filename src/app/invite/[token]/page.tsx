import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { InvitePageClient } from './invite-client'

async function getInviteData(token: string) {
  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      workspace: true,
    },
  })

  return invite
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { userId } = await auth()
  const { token } = await params

  const invite = await getInviteData(token)

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invalid Invitation</h1>
          <p className="mt-2 text-gray-600">This invitation link is invalid or has been removed.</p>
        </div>
      </div>
    )
  }

  if (invite.acceptedAt) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invitation Accepted</h1>
          <p className="mt-2 text-gray-600">This invitation has already been accepted.</p>
          {invite.workspace && (
            <a
              href={`/${invite.workspace.slug}`}
              className="mt-4 inline-block text-blue-600 hover:underline"
            >
              Go to Workspace
            </a>
          )}
        </div>
      </div>
    )
  }

  if (invite.expiresAt < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Invitation Expired</h1>
          <p className="mt-2 text-gray-600">
            This invitation has expired. Please request a new invitation.
          </p>
        </div>
      </div>
    )
  }

  if (!userId) {
    redirect('/sign-in?redirect_url=/invite/' + token)
  }

  return <InvitePageClient invite={invite} userId={userId} />
}
