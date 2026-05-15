import { z } from 'zod'
import { router, protectedProcedure, adminProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'

export const projectRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        name: z.string().min(1).max(100),
        identifier: z.string().min(1).max(10).toUpperCase(),
        description: z.string().optional(),
        icon: z.string().optional(),
        color: z.string().default('#3B82F6'),
        leadId: z.string().optional(),
        startDate: z.string().datetime().optional(),
        targetDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN', 'MEMBER'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to create projects.',
        })
      }

      const existing = await prisma.project.findFirst({
        where: {
          workspaceId: input.workspaceId,
          identifier: input.identifier,
        },
      })

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A project with identifier "${input.identifier}" already exists in this workspace.`,
        })
      }

      const project = await prisma.project.create({
        data: {
          name: input.name,
          identifier: input.identifier,
          description: input.description ?? null,
          icon: input.icon ?? null,
          color: input.color,
          leadId: input.leadId ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          targetDate: input.targetDate ? new Date(input.targetDate) : null,
          workspaceId: input.workspaceId,
        },
      })

      return project
    }),

  update: adminProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().nullable().optional(),
        icon: z.string().nullable().optional(),
        color: z.string().optional(),
        status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'COMPLETED']).optional(),
        leadId: z.string().nullable().optional(),
        startDate: z.string().datetime().nullable().optional(),
        targetDate: z.string().datetime().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })
      }

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can update projects.',
        })
      }

      const data: Record<string, unknown> = {}

      if (input.name !== undefined) data.name = input.name
      if (input.description !== undefined) data.description = input.description
      if (input.icon !== undefined) data.icon = input.icon
      if (input.color !== undefined) data.color = input.color
      if (input.status !== undefined) data.status = input.status
      if (input.leadId !== undefined) data.leadId = input.leadId
      if (input.startDate !== undefined)
        data.startDate = input.startDate ? new Date(input.startDate) : null
      if (input.targetDate !== undefined)
        data.targetDate = input.targetDate ? new Date(input.targetDate) : null

      return prisma.project.update({
        where: { id: input.projectId },
        data,
      })
    }),

  archive: adminProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })
      }

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can archive projects.',
        })
      }

      return prisma.project.update({
        where: { id: input.projectId },
        data: { status: 'ARCHIVED' },
      })
    }),

  delete: adminProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        include: { issues: true },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })
      }

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only admins and owners can delete projects.',
        })
      }

      await prisma.$transaction([
        prisma.issueLabel.deleteMany({
          where: { issue: { projectId: input.projectId } },
        }),
        prisma.comment.deleteMany({
          where: { issue: { projectId: input.projectId } },
        }),
        prisma.activityLog.deleteMany({
          where: { issue: { projectId: input.projectId } },
        }),
        prisma.attachment.deleteMany({
          where: { issue: { projectId: input.projectId } },
        }),
        prisma.issue.deleteMany({
          where: { projectId: input.projectId },
        }),
        prisma.sprint.deleteMany({
          where: { projectId: input.projectId },
        }),
        prisma.project.delete({
          where: { id: input.projectId },
        }),
      ])

      return { success: true }
    }),

  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED', 'COMPLETED']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const projects = await prisma.project.findMany({
        where: {
          workspaceId: input.workspaceId,
          ...(input.status ? { status: input.status } : {}),
        },
        include: {
          _count: {
            select: {
              issues: {
                where: { deletedAt: null },
              },
            },
          },
          issues: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      })

      const leadIds = projects.map((p) => p.leadId).filter((id): id is string => id !== null)

      const leads =
        leadIds.length > 0
          ? await prisma.user.findMany({
              where: { id: { in: leadIds } },
              select: { id: true, name: true, avatarUrl: true },
            })
          : []

      const leadMap = new Map(leads.map((l) => [l.id, l]))

      return projects.map((project) => {
        const totalIssues = project.issues.length
        const doneIssues = project.issues.filter((i) => i.status === 'DONE').length
        const progress = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0
        const openIssues = project.issues.filter(
          (i) => !['DONE', 'CANCELLED'].includes(i.status)
        ).length

        return {
          id: project.id,
          name: project.name,
          identifier: project.identifier,
          description: project.description,
          icon: project.icon,
          color: project.color ?? '#3B82F6',
          status: project.status,
          leadId: project.leadId,
          lead: project.leadId ? (leadMap.get(project.leadId) ?? null) : null,
          startDate: project.startDate,
          targetDate: project.targetDate,
          issueCount: project._count.issues,
          openIssueCount: openIssues,
          doneIssueCount: doneIssues,
          totalIssueCount: totalIssues,
          progress,
          createdAt: project.createdAt,
        }
      })
    }),

  getById: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        include: {
          _count: {
            select: {
              issues: {
                where: { deletedAt: null },
              },
            },
          },
          issues: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
            },
          },
          sprints: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { id: true, name: true, status: true },
          },
        },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })
      }

      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: project.workspaceId,
          user: { clerkId: ctx.userId },
        },
      })

      if (!member) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have access to this project.',
        })
      }

      let lead = null
      if (project.leadId) {
        lead = await prisma.user.findUnique({
          where: { id: project.leadId },
          select: { id: true, name: true, avatarUrl: true, email: true },
        })
      }

      const totalIssues = project.issues.length
      const doneIssues = project.issues.filter((i) => i.status === 'DONE').length
      const progress = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0

      return {
        ...project,
        lead,
        totalIssueCount: totalIssues,
        doneIssueCount: doneIssues,
        progress,
        activeSprint: project.sprints[0] ?? null,
      }
    }),

  getStats: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, workspaceId: true },
      })

      if (!project) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })
      }

      const statusCounts = await prisma.issue.groupBy({
        by: ['status'],
        where: {
          projectId: input.projectId,
          deletedAt: null,
        },
        _count: true,
      })

      const stats: Record<string, number> = {}
      for (const item of statusCounts) {
        stats[item.status] = item._count
      }

      const total = Object.values(stats).reduce((sum, count) => sum + count, 0)
      const done = stats['DONE'] ?? 0
      const progress = total > 0 ? Math.round((done / total) * 100) : 0

      return {
        projectId: project.id,
        total,
        done,
        progress,
        backlog: stats['BACKLOG'] ?? 0,
        todo: stats['TODO'] ?? 0,
        inProgress: stats['IN_PROGRESS'] ?? 0,
        inReview: stats['IN_REVIEW'] ?? 0,
        cancelled: stats['CANCELLED'] ?? 0,
      }
    }),
})
