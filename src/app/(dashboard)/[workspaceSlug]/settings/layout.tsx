import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SettingsSidebar } from './settings-sidebar'

type Props = {
  params: Promise<{ workspaceSlug: string }>
  children: React.ReactNode
}

export default async function SettingsLayout({ params, children }: Props) {
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
    <div className="bg-background flex h-full">
      <SettingsSidebar
        workspaceSlug={workspaceSlug}
        isOwner={workspace.role === 'OWNER'}
      />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
