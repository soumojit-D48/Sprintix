import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import WorkspaceSettingsPage from './page'

type Props = {
  params: Promise<{ workspaceSlug: string }>
}

export default async function WorkspaceSettingsLayout({ params }: Props) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const { workspaceSlug } = await params

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      workspaceMembers: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const workspace = user.workspaceMembers.find((wm) => wm.workspace.slug === workspaceSlug)

  if (!workspace) {
    notFound()
  }

  return (
    <WorkspaceSettingsPage
      workspace={{
        id: workspace.workspace.id,
        name: workspace.workspace.name,
        slug: workspace.workspace.slug,
        plan: workspace.workspace.plan,
        createdAt: workspace.workspace.createdAt,
      }}
    />
  )
}
