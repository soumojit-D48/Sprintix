import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const projectRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        identifier: z.string().min(1).max(10).toUpperCase(),
        color: z.string().default('#3B82F6'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: {
            clerkId: ctx.userId,
          },
          role: {
            in: ['OWNER', 'ADMIN', 'MEMBER'],
          },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create projects',
        })
      }

      const project = await prisma.project.create({
        data: {
          name: input.name,
          identifier: input.identifier,
          color: input.color,
          workspaceId: input.workspaceId,
        },
      })

      return project
    }),

  getByWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          status: 'ACTIVE',
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return projects
    }),
})
