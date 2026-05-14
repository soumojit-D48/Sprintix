import { z } from 'zod'
import { router, protectedProcedure, ownerProcedure } from '../trpc'
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
          previousSlugs: { set: [] },
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

  update: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100).optional(),
        slug: z
          .string()
          .min(1)
          .max(50)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        logoUrl: z.string().url().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is owner of this workspace
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: 'OWNER',
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the workspace owner can perform this action.',
        })
      }

      const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
      })

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        })
      }

      const updateData: Record<string, unknown> = {}

      if (input.name !== undefined) {
        updateData.name = input.name
      }

      if (input.logoUrl !== undefined) {
        updateData.logoUrl = input.logoUrl
      }

      if (input.slug && input.slug !== workspace.slug) {
        const slugExists = await prisma.workspace.findFirst({
          where: {
            slug: input.slug,
            id: { not: input.workspaceId },
          },
        })

        if (slugExists) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Workspace with this slug already exists.',
          })
        }

        updateData.slug = input.slug
        updateData.previousSlugs = {
          push: workspace.slug,
        }
      }

      const updatedWorkspace = await prisma.workspace.update({
        where: { id: input.workspaceId },
        data: updateData,
      })

      return updatedWorkspace
    }),

  delete: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      })

      if (!workspace) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Workspace not found.',
        })
      }

      // Check if the current user is the owner by comparing clerkId
      const isOwner = workspace.members.some(
        (m) => m.user.clerkId === ctx.userId && m.role === 'OWNER'
      )

      if (!isOwner) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the workspace owner can delete the workspace.',
        })
      }

      // Delete related records first to avoid FK constraint violations
      await prisma.$transaction([
        // Delete all workspace members
        prisma.workspaceMember.deleteMany({
          where: { workspaceId: input.workspaceId },
        }),
        // Delete all invites
        prisma.invite.deleteMany({
          where: { workspaceId: input.workspaceId },
        }),
        // Delete all channels
        prisma.channel.deleteMany({
          where: { workspaceId: input.workspaceId },
        }),
      ])

      // Delete projects (this will cascade to issues, comments, etc.)
      const projects = await prisma.project.findMany({
        where: { workspaceId: input.workspaceId },
        select: { id: true },
      })

      for (const project of projects) {
        // Delete issues for each project (cascade handles this, but let's be explicit)
        await prisma.issue.deleteMany({
          where: { projectId: project.id },
        })
      }

      // Delete projects
      await prisma.project.deleteMany({
        where: { workspaceId: input.workspaceId },
      })

      // Finally delete the workspace
      await prisma.workspace.delete({
        where: { id: input.workspaceId },
      })

      return { success: true }
    }),

  getBySlug: protectedProcedure
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
          message: 'Workspace not found.',
        })
      }

      return workspaceMember.workspace
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

  resolveSlug: protectedProcedure.input(z.object({ slug: z.string() })).query(async ({ input }) => {
    // First try exact match
    const workspace = await prisma.workspace.findUnique({
      where: { slug: input.slug },
    })

    if (workspace) {
      return { workspace, isCurrentSlug: true }
    }

    // Check if this is a previous slug
    const workspaceWithPreviousSlug = await prisma.workspace.findFirst({
      where: {
        previousSlugs: {
          has: input.slug,
        },
      },
    })

    if (workspaceWithPreviousSlug) {
      return { workspace: workspaceWithPreviousSlug, isCurrentSlug: false }
    }

    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Workspace not found.',
    })
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
