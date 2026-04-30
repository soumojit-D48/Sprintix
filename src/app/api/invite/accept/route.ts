import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { inviteId, userId } = await request.json()

    if (!inviteId || !userId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const invite = await prisma.invite.findUnique({
      where: { id: inviteId },
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid invitation' }, { status: 404 })
    }

    if (invite.acceptedAt) {
      return NextResponse.json({ error: 'Invitation already accepted' }, { status: 400 })
    }

    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found. Please sign up first.' }, { status: 404 })
    }

    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: invite.workspaceId,
        userId: user.id,
      },
    })

    if (existingMember) {
      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.workspaceMember.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: invite.role,
        },
      }),
      prisma.invite.update({
        where: { id: inviteId },
        data: {
          acceptedAt: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
