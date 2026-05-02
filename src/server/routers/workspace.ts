import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const workspaceRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9-]+$/),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingWorkspace = await prisma.workspace.findUnique({
        where: { slug: input.slug },
      })

      if (existingWorkspace) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Workspace with this slug already exists',
        })
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      })

      if (!user) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Current user is not registered in the database.',
        })
      }

      const workspace = await prisma.workspace.create({
        data: {
          name: input.name,
          slug: input.slug,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
        include: {
          members: true,
        },
      })

      return workspace
    }),

  getUserWorkspaces: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId },
      include: {
        workspaceMembers: {
          include: {
            workspace: true,
          },
        },
      },
    })

    return user?.workspaceMembers.map((wm) => wm.workspace) || []
  }),

  getUserWorkspace: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspaceMember = await prisma.workspaceMember.findFirst({
        where: {
          workspace: {
            slug: input.slug,
          },
          user: {
            clerkId: ctx.userId,
          },
        },
        include: {
          workspace: true,
        },
      })

      if (!workspaceMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found',
        })
      }

      return workspaceMember.workspace
    }),

  inviteMembers: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        emails: z.array(z.string().email()),
        role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']).default('MEMBER'),
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
            in: ['OWNER', 'ADMIN'],
          },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to invite members',
        })
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const invites = await Promise.all(
        input.emails.map((email) =>
          prisma.invite.create({
            data: {
              email,
              workspaceId: input.workspaceId,
              role: input.role,
              expiresAt,
            },
          })
        )
      )

      return invites
    }),
})
