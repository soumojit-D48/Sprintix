import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

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

  return user
}

export async function requireAuth() {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

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
    throw new Error('User not found')
  }

  return user
}

export async function getCurrentWorkspaceMember(workspaceSlug: string) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  })

  if (!user) {
    return null
  }

  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      workspace: {
        slug: workspaceSlug,
      },
      userId: user.id,
    },
    include: {
      workspace: true,
      user: true,
    },
  })

  return workspaceMember
}

export async function requireWorkspaceMember(workspaceSlug: string) {
  const member = await getCurrentWorkspaceMember(workspaceSlug)

  if (!member) {
    redirect('/')
  }

  return member
}
