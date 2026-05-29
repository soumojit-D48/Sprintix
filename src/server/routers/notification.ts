import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const notificationRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        take: input.limit + 1,
        orderBy: { createdAt: 'desc' },
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      })

      const hasMore = notifications.length > input.limit
      if (hasMore) {
        notifications.pop()
      }

      const nextCursor = hasMore && notifications.length > 0 ? notifications[notifications.length - 1]!.id : null

      return {
        notifications,
        nextCursor,
      }
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      const notification = await prisma.notification.findUnique({
        where: { id: input.id },
        select: { userId: true },
      })

      if (!notification) throw new TRPCError({ code: 'NOT_FOUND', message: 'Notification not found' })
      if (notification.userId !== user.id) throw new TRPCError({ code: 'FORBIDDEN' })

      return prisma.notification.update({
        where: { id: input.id },
        data: { read: true },
      })
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    return prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })
  }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const count = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })

    return { count }
  }),

  updatePreferences: protectedProcedure
    .input(z.object({ preferences: z.record(z.string(), z.boolean()) }))
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      return prisma.user.update({
        where: { id: user.id },
        data: { notificationPreferences: input.preferences as any },
      })
    }),
})
