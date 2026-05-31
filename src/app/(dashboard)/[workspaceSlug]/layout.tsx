import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { getServerAsyncCaller } from '@/lib/trpc/server'
import { Sidebar } from '@/components/layout/Sidebar/Sidebar'
import { Topbar } from '@/components/layout/Topbar/Topbar'
import { CommandPalette } from '@/components/layout/CommandPalette'
import { prisma } from '@/lib/prisma'
import { RealtimeProvider } from '@/components/layout/RealtimeProvider'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string }>
}) {
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const { workspaceSlug } = await params

  const caller = await getServerAsyncCaller()

  let workspaces: { id: string; name: string; slug: string }[] = []
  let currentWorkspace: { id: string; name: string; slug: string } | null = null
  let projects: { id: string; name: string; identifier: string; color: string }[] = []
  let channels: {
    id: string
    name: string
    type: 'PUBLIC' | 'PRIVATE' | 'DM'
    unreadCount?: number
  }[] = []

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        workspaceMembers: {
          include: {
            workspace: {
              include: {
                projects: {
                  orderBy: { createdAt: 'desc' },
                  take: 10,
                },
              },
            },
          },
        },
      },
    })

    if (user) {
      workspaces = user.workspaceMembers.map((wm) => ({
        id: wm.workspace.id,
        name: wm.workspace.name,
        slug: wm.workspace.slug,
      }))

      const memberShip = user.workspaceMembers.find((wm) => wm.workspace.slug === workspaceSlug)

      if (memberShip) {
        currentWorkspace = {
          id: memberShip.workspace.id,
          name: memberShip.workspace.name,
          slug: memberShip.workspace.slug,
        }
        projects = memberShip.workspace.projects.map((p) => ({
          id: p.id,
          name: p.name,
          identifier: p.identifier,
          color: p.color ?? '#000000',
        }))

        const dbChannels = await prisma.channel.findMany({
          where: {
            workspaceId: currentWorkspace.id,
            archivedAt: null,
            OR: [
              { type: 'PUBLIC' },
              { type: 'PRIVATE', members: { some: { userId: user.id } } },
            ],
          },
          select: { id: true, name: true, type: true },
          orderBy: { createdAt: 'asc' },
        })

        const channelMemberships = await prisma.channelMember.findMany({
          where: {
            channelId: { in: dbChannels.map((c) => c.id) },
            userId: user.id,
          },
          select: { channelId: true, lastReadAt: true },
        })

        const lastReadMap = new Map(channelMemberships.map((e) => [e.channelId, e.lastReadAt]))

        const channelsWithUnread = await Promise.all(
          dbChannels.map(async (channel) => {
            const lastReadAt = lastReadMap.get(channel.id)
            let unreadCount = 0
            if (lastReadAt) {
              unreadCount = await prisma.message.count({
                where: {
                  channelId: channel.id,
                  createdAt: { gt: lastReadAt },
                  senderId: { not: user.id },
                },
              })
            }
            return {
              id: channel.id,
              name: channel.name,
              type: channel.type as 'PUBLIC' | 'PRIVATE' | 'DM',
              unreadCount: unreadCount > 0 ? unreadCount : undefined,
            }
          })
        )

        channels = channelsWithUnread as { id: string; name: string; type: 'PUBLIC' | 'PRIVATE' | 'DM'; unreadCount?: number }[]
      }
    }
  } catch (error) {
    console.error('Error fetching workspace data:', error)
  }

  if (!currentWorkspace) {
    redirect('/onboarding')
  }

  return (
    <div className="bg-background flex h-screen w-full">
      <Sidebar
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        projects={projects}
        channels={channels}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar workspaceName={currentWorkspace.slug} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
      <CommandPalette projects={projects} workspaceSlug={workspaceSlug} />
      <RealtimeProvider workspaceId={currentWorkspace.id} />
    </div>
  )
}
