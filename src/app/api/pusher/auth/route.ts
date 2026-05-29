import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const data = await req.formData()
    const socketId = data.get('socket_id') as string
    const channel = data.get('channel_name') as string

    if (!socketId || !channel) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Authorize private user channel for real-time notifications
    if (channel.startsWith('private-user-')) {
      const dbUserId = channel.replace('private-user-', '')
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      })
      if (!user || user.id !== dbUserId) {
        return new NextResponse('Forbidden', { status: 403 })
      }
      const authResponse = pusherServer.authorizeChannel(socketId, channel)
      return NextResponse.json(authResponse)
    }

    // Extract workspaceId from channel name (format: private-workspace-{workspaceId} or presence-workspace-{workspaceId})
    const isPrivate = channel.startsWith('private-workspace-')
    const isPresence = channel.startsWith('presence-workspace-')

    let workspaceId: string | undefined
    if (isPrivate) workspaceId = channel.replace('private-workspace-', '')
    else if (isPresence) workspaceId = channel.replace('presence-workspace-', '')

    if (!workspaceId) {
      return new NextResponse('Invalid channel format', { status: 403 })
    }

    // Verify user is a member of this workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        user: { clerkId: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          }
        }
      }
    })

    if (!member) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    let authResponse
    if (isPresence) {
      const presenceData = {
        user_id: member.user.id,
        user_info: {
          name: member.user.name,
          avatarUrl: member.user.avatarUrl,
        },
      }
      authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData)
    } else {
      authResponse = pusherServer.authorizeChannel(socketId, channel)
    }

    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
