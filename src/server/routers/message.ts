import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import { extractMentionsFromTiptap } from '@/lib/mentions'
import { notifyMentioned, notifyMessageReceived } from '@/lib/notifications'
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  reactToMessageSchema,
  unreactToMessageSchema,
  searchMessagesSchema,
  getThreadSchema,
} from '@/lib/validations/message'

function extractPlainText(body: Record<string, unknown>): string {
  const content = (body as any)?.content
  if (!content || !Array.isArray(content)) return ''
  return content
    .map((node: any) => {
      if (node.type === 'paragraph' && node.content) {
        return node.content.map((n: any) => n.text || '').join('')
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
    .slice(0, 200)
}

async function getUser(prisma: any, clerkId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true, name: true, avatarUrl: true },
  })
  if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
  return user
}

async function verifyChannelAccess(prisma: any, userId: string, channelId: string) {
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { workspaceId: true, type: true, archivedAt: true },
  })
  if (!channel || channel.archivedAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Channel not found' })

  const workspaceMember = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: channel.workspaceId } },
    select: { role: true },
  })
  if (!workspaceMember) throw new TRPCError({ code: 'FORBIDDEN' })

  if (channel.type === 'PRIVATE') {
    const channelMember = await prisma.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId } },
    })
    if (!channelMember) throw new TRPCError({ code: 'FORBIDDEN' })
  }

  return { workspaceId: channel.workspaceId }
}

const messageIncludes = {
  sender: { select: { id: true, name: true, avatarUrl: true } },
  reactions: { select: { id: true, emoji: true, userId: true } },
  attachments: {
    select: { id: true, name: true, url: true, size: true, mimeType: true },
  },
  _count: { select: { replies: true } },
}

export const messageRouter = router({
  list: protectedProcedure.input(listMessagesSchema).query(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    await verifyChannelAccess(prisma, user.id, input.channelId)

    const messages = await prisma.message.findMany({
      where: {
        channelId: input.channelId,
        deletedAt: null,
        parentId: null,
      },
      take: input.limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      include: messageIncludes,
    })

    const hasMore = messages.length > input.limit
    if (hasMore) messages.pop()

    const lastItem = messages.length > 0 ? messages[messages.length - 1] : null
    const nextCursor = hasMore && lastItem ? lastItem.id : null

    return {
      messages: messages.reverse(),
      nextCursor,
    }
  }),

  send: protectedProcedure.input(sendMessageSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)
    const { workspaceId } = await verifyChannelAccess(prisma, user.id, input.channelId)

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.message.create({
        data: {
          body: input.body as object,
          channelId: input.channelId,
          senderId: user.id,
          parentId: input.parentId ?? null,
          ...(input.attachments?.length
            ? {
                attachments: {
                  create: input.attachments.map((a) => ({
                    name: a.name,
                    url: a.url,
                    size: a.size,
                    mimeType: a.mimeType,
                  })),
                },
              }
            : {}),
        },
        include: messageIncludes,
      })

      return created
    })

    // Process notifications outside transaction
    const mentionedIds = extractMentionsFromTiptap(input.body)
    const filteredMentionedIds = mentionedIds.filter((id) => id !== user.id)

    if (filteredMentionedIds.length > 0) {
      await notifyMentioned(
        {
          id: message.id,
          type: 'message',
        },
        filteredMentionedIds,
        user.name
      )
    }

    // Notify DM recipient
    const channel = await prisma.channel.findUnique({
      where: { id: input.channelId },
      select: { type: true, members: { select: { userId: true } } },
    })
    if (channel?.type === 'DM') {
      const otherMemberId = channel.members.find((m) => m.userId !== user.id)?.userId
      if (otherMemberId && !filteredMentionedIds.includes(otherMemberId)) {
        const bodyText = extractPlainText(input.body)
        await notifyMessageReceived(
          { id: message.id, senderId: user.id, body: bodyText },
          otherMemberId,
          user.name || 'Someone'
        )
      }
    }

    await triggerEvent(`private-workspace-${workspaceId}`, 'message:created', {
      channelId: input.channelId,
      messageId: message.id,
      workspaceId,
    })

    if (input.parentId) {
      await triggerEvent(`private-workspace-${workspaceId}`, 'message:thread-reply', {
        channelId: input.channelId,
        messageId: message.id,
        parentId: input.parentId,
      })
    }

    return message
  }),

  edit: protectedProcedure.input(editMessageSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const existing = await prisma.message.findUnique({
      where: { id: input.messageId },
      include: { channel: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })
    if (existing.senderId !== user.id) throw new TRPCError({ code: 'FORBIDDEN' })

    const updated = await prisma.message.update({
      where: { id: input.messageId },
      data: {
        body: input.body as object,
        editedAt: new Date(),
      },
      include: messageIncludes,
    })

    await triggerEvent(`private-workspace-${existing.channel!.workspaceId}`, 'message:updated', {
      channelId: existing.channelId,
      messageId: input.messageId,
    })

    return updated
  }),

  delete: protectedProcedure.input(deleteMessageSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const existing = await prisma.message.findUnique({
      where: { id: input.messageId },
      include: { channel: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })
    if (existing.senderId !== user.id) throw new TRPCError({ code: 'FORBIDDEN' })

    await prisma.message.update({
      where: { id: input.messageId },
      data: { deletedAt: new Date() },
    })

    await triggerEvent(`private-workspace-${existing.channel!.workspaceId}`, 'message:deleted', {
      channelId: existing.channelId,
      messageId: input.messageId,
    })

    return { success: true }
  }),

  react: protectedProcedure.input(reactToMessageSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const message = await prisma.message.findUnique({
      where: { id: input.messageId },
      include: { channel: { select: { workspaceId: true } } },
    })
    if (!message || message.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const existing = await prisma.messageReaction.findUnique({
      where: {
        userId_messageId_emoji: {
          userId: user.id,
          messageId: input.messageId,
          emoji: input.emoji,
        },
      },
    })

    if (existing) return existing

    await prisma.messageReaction.deleteMany({
      where: { userId: user.id, messageId: input.messageId, emoji: { not: input.emoji } },
    })

    const reaction = await prisma.messageReaction.create({
      data: {
        emoji: input.emoji,
        userId: user.id,
        messageId: input.messageId,
      },
    })

    await triggerEvent(`private-workspace-${message.channel!.workspaceId}`, 'message:reacted', {
      channelId: message.channelId,
      messageId: input.messageId,
      emoji: input.emoji,
      userId: user.id,
    })

    return reaction
  }),

  unreact: protectedProcedure.input(unreactToMessageSchema).mutation(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const message = await prisma.message.findUnique({
      where: { id: input.messageId },
      include: { channel: { select: { workspaceId: true } } },
    })
    if (!message || message.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    await prisma.messageReaction.deleteMany({
      where: {
        userId: user.id,
        messageId: input.messageId,
        emoji: input.emoji,
      },
    })

    await triggerEvent(`private-workspace-${message.channel!.workspaceId}`, 'message:unreacted', {
      channelId: message.channelId,
      messageId: input.messageId,
      emoji: input.emoji,
      userId: user.id,
    })

    return { success: true }
  }),

  search: protectedProcedure.input(searchMessagesSchema).query(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId: user.id, workspaceId: input.workspaceId } },
    })
    if (!workspaceMember) throw new TRPCError({ code: 'FORBIDDEN' })

    const channels = await prisma.channel.findMany({
      where: {
        workspaceId: input.workspaceId,
        archivedAt: null,
        OR: [
          { type: 'PUBLIC' },
          { type: 'PRIVATE', members: { some: { userId: user.id } } },
        ],
      },
      select: { id: true, name: true },
    })

    if (channels.length === 0) return { results: [] }

    const channelIds = channels.map((c: any) => c.id)

    const messages = await prisma.$queryRaw<any[]>`
      SELECT 
        m.id,
        m."channelId",
        m."senderId",
        m."createdAt",
        m."body"::text as body_text,
        u.name as sender_name,
        u."avatarUrl" as sender_avatar_url,
        c.name as channel_name
      FROM "Message" m
      JOIN "User" u ON u.id = m."senderId"
      JOIN "Channel" c ON c.id = m."channelId"
      WHERE 
        m."channelId" = ANY(${channelIds}::text[])
        AND m."deletedAt" IS NULL
        AND m."parentId" IS NULL
        AND m."body"::text ILIKE ${'%' + input.query + '%'}
      ORDER BY m."createdAt" DESC
      LIMIT ${input.limit}
    `

    const results = messages.map((row: any) => ({
      id: row.id,
      channelId: row.channelId,
      channelName: row.channel_name,
      senderId: row.senderId,
      senderName: row.sender_name,
      senderAvatarUrl: row.sender_avatar_url,
      bodyText: typeof row.body_text === 'string' ? row.body_text.substring(0, 300) : '',
      createdAt: row.createdAt,
    }))

    return { results }
  }),

  getThread: protectedProcedure.input(getThreadSchema).query(async ({ ctx, input }) => {
    const user = await getUser(prisma, ctx.userId!)

    const parentMessage = await prisma.message.findUnique({
      where: { id: input.messageId },
      include: {
        ...messageIncludes,
        channel: { select: { workspaceId: true, type: true } },
      },
    })
    if (!parentMessage || parentMessage.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    await verifyChannelAccess(prisma, user.id, parentMessage.channelId!)

    const replies = await prisma.message.findMany({
      where: { parentId: input.messageId, deletedAt: null },
      orderBy: [{ createdAt: 'asc' }],
      include: messageIncludes,
    })

    return {
      parentMessage,
      replies,
    }
  }),
})
