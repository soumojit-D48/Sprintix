import { z } from 'zod'
import { randomBytes, createHash } from 'crypto'
import { router, protectedProcedure, ownerProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = `tf_${randomBytes(32).toString('hex')}`
  const prefix = raw.slice(0, 12)
  const hash = hashApiKey(raw)
  return { raw, prefix, hash }
}

export const settingsRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        timezone: true,
      },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return user
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        avatarUrl: z.string().url().nullable().optional(),
        timezone: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const updateData: Record<string, unknown> = {}
      if (input.name !== undefined) updateData.name = input.name
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl
      if (input.timezone !== undefined) updateData.timezone = input.timezone

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: { id: true, name: true, email: true, avatarUrl: true, timezone: true },
      })
      return updated
    }),

  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: {
        id: true,
        notificationPreferences: true,
      },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })
    return user.notificationPreferences as Record<string, boolean>
  }),

  updateNotificationPreferences: protectedProcedure
    .input(z.object({ preferences: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      await prisma.user.update({
        where: { id: user.id },
        data: { notificationPreferences: input.preferences as any },
      })
      return { success: true }
    }),

  getChannelMutes: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const preferences = await prisma.user.findUnique({
        where: { id: user.id },
        select: { notificationPreferences: true },
      })

      const prefs = (preferences?.notificationPreferences as Record<string, unknown>) || {}
      const mutedChannels = (prefs.mutedChannels as string[]) || []
      return { mutedChannels }
    }),

  toggleChannelMute: protectedProcedure
    .input(z.object({ channelId: z.string(), muted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true, notificationPreferences: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const prefs = (user.notificationPreferences as Record<string, unknown>) || {}
      const mutedChannels = (prefs.mutedChannels as string[]) || []

      let updatedMuted: string[]
      if (input.muted) {
        updatedMuted = [...mutedChannels.filter((id: string) => id !== input.channelId), input.channelId]
      } else {
        updatedMuted = mutedChannels.filter((id: string) => id !== input.channelId)
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { notificationPreferences: { ...prefs, mutedChannels: updatedMuted } as any },
      })
      return { success: true }
    }),

  getUserChannels: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const channels = await prisma.channel.findMany({
        where: {
          workspaceId: input.workspaceId,
          archivedAt: null,
          members: { some: { userId: user.id } },
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })

      return channels
    }),

  getApiKeys: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return keys
  }),

  createApiKey: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const { raw, prefix, hash } = generateApiKey()

      await prisma.apiKey.create({
        data: {
          name: input.name,
          keyPrefix: prefix,
          keyHash: hash,
          userId: user.id,
        },
      })

      return { key: raw, prefix, name: input.name }
    }),

  revokeApiKey: protectedProcedure
    .input(z.object({ keyId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const key = await prisma.apiKey.findUnique({ where: { id: input.keyId } })
      if (!key || key.userId !== user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'API key not found.' })
      }

      await prisma.apiKey.update({
        where: { id: input.keyId },
        data: { revokedAt: new Date() },
      })

      return { success: true }
    }),
})
