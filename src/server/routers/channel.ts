import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import {
  createChannelSchema,
  updateChannelSchema,
  listChannelsSchema,
  getChannelSchema,
  archiveChannelSchema,
  addChannelMemberSchema,
  removeChannelMemberSchema,
  getChannelMembersSchema,
  createDmSchema,
  listDmsSchema,
} from '@/lib/validations/channel'

async function getUser(prisma: any, clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return user
}

async function getWorkspaceMember(prisma: any, userId: string, workspaceId: string) {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true },
  })
  if (!member) throw new TRPCError({ code: 'FORBIDDEN' })
  return member
}

const roleHierarchy: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

function hasMinRole(role: string, min: string): boolean {
  return (roleHierarchy[role] ?? -1) >= (roleHierarchy[min] ?? 99)
}

export const channelRouter = router({
  list: protectedProcedure.input(listChannelsSchema).query(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    await getWorkspaceMember(prisma, user.id, input.workspaceId)

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId: input.workspaceId,
        archivedAt: null,
        OR: [
          { type: 'PUBLIC' },
          { type: 'PRIVATE', members: { some: { userId: user.id } } },
        ],
      },
      include: {
        _count: { select: { members: true, messages: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    const channelMemberEntries = await prisma.channelMember.findMany({
      where: {
        channelId: { in: channels.map((c: any) => c.id) },
        userId: user.id,
      },
      select: { channelId: true, lastReadAt: true },
    })

    const lastReadMap = new Map(channelMemberEntries.map((e: any) => [e.channelId, e.lastReadAt]))

    const channelsWithUnread = await Promise.all(
      channels.map(async (channel: any) => {
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
          description: channel.description,
          type: channel.type,
          createdAt: channel.createdAt,
          createdById: channel.createdById,
          memberCount: channel._count.members,
          unreadCount,
        }
      })
    )

    return channelsWithUnread
  }),

  getById: protectedProcedure.input(getChannelSchema).query(async ({ ctx, input }) => {
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      include: {
        _count: { select: { members: true, messages: true } },
      },
    })
    if (!channel || channel.archivedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await getUser(prisma, ctx.userId!)
    const membership = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: input.channelId, userId: user.id } },
    })

    if (channel.type === 'PRIVATE' && !membership) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    return channel
  }),

  create: protectedProcedure.input(createChannelSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const member = await getWorkspaceMember(prisma, user.id, input.workspaceId)

    if (input.type === 'PRIVATE' && !hasMinRole(member.role, 'ADMIN')) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only admins can create private channels.',
      })
    }

    const channel = await prisma.$transaction(async (tx) => {
      const created = await tx.channel.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          type: input.type,
          workspaceId: input.workspaceId,
          createdById: user.id,
        },
      })

      await tx.channelMember.create({
        data: {
          channelId: created.id,
          userId: user.id,
        },
      })

      if (input.memberIds && input.memberIds.length > 0) {
        const uniqueIds = [...new Set(input.memberIds.filter((id) => id !== user.id))]
        if (uniqueIds.length > 0) {
          await tx.channelMember.createMany({
            data: uniqueIds.map((memberId) => ({
              channelId: created.id,
              userId: memberId,
            })),
            skipDuplicates: true,
          })
        }
      }

      return created
    })

    await triggerEvent(`private-workspace-${input.workspaceId}`, 'channel:created', {
      channelId: channel.id,
      name: channel.name,
    })

    return channel
  }),

  update: protectedProcedure.input(updateChannelSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { workspaceId: true, createdById: true, archivedAt: true },
    })
    if (!channel || channel.archivedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getWorkspaceMember(prisma, user.id, channel.workspaceId)
    if (channel.createdById !== user.id && !hasMinRole(member.role, 'ADMIN')) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    const updateData: Record<string, string> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description

    return prisma.channel.update({
      where: { id: input.channelId },
      data: updateData,
    })
  }),

  archive: protectedProcedure.input(archiveChannelSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { workspaceId: true, type: true },
    })
    if (!channel) throw new TRPCError({ code: 'NOT_FOUND' })
    if (channel.type === 'DM') throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot archive DM channels' })

    const member = await getWorkspaceMember(prisma, user.id, channel.workspaceId)
    if (!hasMinRole(member.role, 'ADMIN')) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    await prisma.channel.update({
      where: { id: input.channelId },
      data: { archivedAt: new Date() },
    })

    await triggerEvent(`private-workspace-${channel.workspaceId}`, 'channel:archived', {
      channelId: input.channelId,
    })

    return { success: true }
  }),

  addMember: protectedProcedure.input(addChannelMemberSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { workspaceId: true, createdById: true, type: true },
    })
    if (!channel) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getWorkspaceMember(prisma, user.id, channel.workspaceId)
    if (channel.createdById !== user.id && !hasMinRole(member.role, 'ADMIN')) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    const targetUser = await prisma.user.findUnique({ where: { id: input.userId } })
    if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' })

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: input.userId, workspaceId: channel.workspaceId } },
    })
    if (!workspaceMember) throw new TRPCError({ code: 'BAD_REQUEST', message: 'User is not a workspace member' })

    const existing = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId: input.channelId, userId: input.userId } },
    })
    if (existing) return existing

    return prisma.channelMember.create({
      data: { channelId: input.channelId, userId: input.userId },
    })
  }),

  removeMember: protectedProcedure.input(removeChannelMemberSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { workspaceId: true, createdById: true, type: true },
    })
    if (!channel) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getWorkspaceMember(prisma, user.id, channel.workspaceId)
    if (channel.createdById !== user.id && !hasMinRole(member.role, 'ADMIN') && user.id !== input.userId) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    if (channel.createdById === input.userId) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot remove channel creator' })
    }

    await prisma.channelMember.deleteMany({
      where: { channelId: input.channelId, userId: input.userId },
    })

    return { success: true }
  }),

  getMembers: protectedProcedure.input(getChannelMembersSchema).query(async ({ ctx, input }) => {
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { workspaceId: true, type: true },
    })
    if (!channel) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await getUser(prisma, ctx.userId!)
    await getWorkspaceMember(prisma, user.id, channel.workspaceId)

    if (channel.type === 'PRIVATE') {
      const membership = await prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId: input.channelId, userId: user.id } },
      })
      if (!membership) throw new TRPCError({ code: 'FORBIDDEN' })
    }

    return prisma.channelMember.findMany({
      where: { channelId: input.channelId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, email: true } },
      },
    })
  }),

  createDm: protectedProcedure.input(createDmSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    await getWorkspaceMember(prisma, user.id, input.workspaceId)

    if (input.participantId === user.id) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot DM yourself' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: input.participantId },
      select: { id: true, name: true },
    })
    if (!targetUser) throw new TRPCError({ code: 'NOT_FOUND', message: 'Target user not found' })

    const targetWorkspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: input.participantId, workspaceId: input.workspaceId } },
    })
    if (!targetWorkspaceMember) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Target user is not a workspace member' })
    }

    const participantIds = [user.id, input.participantId].sort()
    const participantKey = participantIds.join(':')

    const existingDm = await prisma.directMessage.findFirst({
      where: {
        workspaceId: input.workspaceId,
        participantIds: { hasEvery: participantIds },
      },
    })

    if (existingDm) {
      const existingChannel = await prisma.channel.findFirst({
        where: {
          workspaceId: input.workspaceId,
          type: 'DM',
          name: participantKey,
        },
      })
      if (existingChannel && !existingChannel.archivedAt) return existingChannel
    }

    const channel = await prisma.$transaction(async (tx) => {
      await tx.directMessage.create({
        data: {
          workspaceId: input.workspaceId,
          participantIds: participantIds,
        },
      })

      const created = await tx.channel.create({
        data: {
          name: participantKey,
          type: 'DM',
          workspaceId: input.workspaceId,
          createdById: user.id,
        },
      })

      await tx.channelMember.createMany({
        data: participantIds.map((pid) => ({
          channelId: created.id,
          userId: pid,
        })),
      })

      return created
    })

    return channel
  }),

  listDms: protectedProcedure.input(listDmsSchema).query(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    await getWorkspaceMember(prisma, user.id, input.workspaceId)

    const dmChannels = await prisma.channel.findMany({
      where: {
        workspaceId: input.workspaceId,
        type: 'DM',
        archivedAt: null,
        members: { some: { userId: user.id } },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const dmList = await Promise.all(
      dmChannels.map(async (channel: any) => {
        const otherMember = channel.members.find((m: any) => m.userId !== user.id)
        const lastReadEntry = channel.members.find((m: any) => m.userId === user.id)
        let unreadCount = 0
        if (lastReadEntry?.lastReadAt) {
          unreadCount = await prisma.message.count({
            where: {
              channelId: channel.id,
              createdAt: { gt: lastReadEntry.lastReadAt },
              senderId: { not: user.id },
            },
          })
        }
        return {
          id: channel.id,
          name: otherMember?.user.name ?? 'Unknown',
          type: 'DM' as const,
          otherUser: otherMember?.user ?? null,
          unreadCount,
        }
      })
    )

    return dmList
  }),

  getUnreadCounts: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const user = await getUser(prisma, ctx.userId!)
      await getWorkspaceMember(prisma, user.id, input.workspaceId)

      const memberships = await prisma.channelMember.findMany({
        where: { userId: user.id, channel: { workspaceId: input.workspaceId, archivedAt: null } },
        select: { channelId: true, lastReadAt: true },
      })

      const counts: Record<string, number> = {}
      for (const membership of memberships) {
        if (membership.lastReadAt) {
          counts[membership.channelId] = await prisma.message.count({
            where: {
              channelId: membership.channelId,
              createdAt: { gt: membership.lastReadAt },
              senderId: { not: user.id },
            },
          })
        } else {
          counts[membership.channelId] = await prisma.message.count({
            where: { channelId: membership.channelId, senderId: { not: user.id } },
          })
        }
      }

      return counts
    }),

  markAsRead: protectedProcedure
    .input(z.object({ channelId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUser(prisma, ctx.userId!)

      await prisma.channelMember.updateMany({
        where: { channelId: input.channelId, userId: user.id },
        data: { lastReadAt: new Date() },
      })

      return { success: true }
    }),
})
