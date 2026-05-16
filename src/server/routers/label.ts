import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const labelRouter = router({
  list: protectedProcedure.input(z.object({ workspaceId: z.string() })).query(async ({ input }) => {
    const labels = await prisma.label.findMany({
      where: { workspaceId: input.workspaceId },
      include: {
        _count: { select: { issues: true } },
      },
      orderBy: { name: 'asc' },
    })
    return labels
  }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        name: z.string().min(1).max(50),
        color: z.string().default('#6366F1'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
        },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const existing = await prisma.label.findFirst({
        where: { workspaceId: input.workspaceId, name: input.name },
      })
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Label already exists' })

      return prisma.label.create({
        data: {
          name: input.name,
          color: input.color,
          workspaceId: input.workspaceId,
        },
      })
    }),

  delete: protectedProcedure
    .input(z.object({ labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const label = await prisma.label.findUnique({
        where: { id: input.labelId },
        include: { issues: true },
      })
      if (!label) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: label.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      await prisma.issueLabel.deleteMany({ where: { labelId: input.labelId } })
      return prisma.label.delete({ where: { id: input.labelId } })
    }),
})
