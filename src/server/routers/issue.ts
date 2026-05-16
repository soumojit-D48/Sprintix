import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import {
  createIssueSchema,
  updateIssueSchema,
  updateStatusSchema,
  updatePrioritySchema,
  assignIssueSchema,
  reorderIssueSchema,
  bulkUpdateSchema,
  listIssuesSchema,
} from '@/lib/validations/issue'

async function getMemberByClerkId(workspaceId: string, clerkId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { clerkId } },
  })
}

async function getProjectWorkspaceId(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  })
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found' })
  return project
}

async function createActivityLog(
  entityId: string,
  entityType: string,
  action: string,
  metadata: unknown,
  userId: string
) {
  return prisma.activityLog.create({
    data: { entityId, entityType, action, metadata: metadata as object, userId },
  })
}

export const issueRouter = router({
  create: protectedProcedure.input(createIssueSchema).mutation(async ({ ctx, input }) => {
    const { workspaceId } = await getProjectWorkspaceId(input.projectId)
    const member = await getMemberByClerkId(workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const project = await prisma.project.update({
      where: { id: input.projectId },
      data: { issueCount: { increment: 1 } },
      select: { identifier: true, issueCount: true },
    })

    const issue = await prisma.issue.create({
      data: {
        identifier: `${project.identifier}-${project.issueCount}`,
        title: input.title,
        description: input.description ?? undefined,
        status: input.status,
        priority: input.priority,
        projectId: input.projectId,
        assigneeId: input.assigneeId ?? null,
        reporterId: member.userId,
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        sprintId: input.sprintId ?? null,
        parentId: input.parentId ?? null,
        order: Date.now(),
        ...(input.labelIds?.length
          ? { labels: { create: input.labelIds.map((id) => ({ labelId: id })) } }
          : {}),
      },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        labels: { include: { label: true } },
        sprint: { select: { id: true, name: true, status: true } },
      },
    })

    await createActivityLog(issue.id, 'issue', 'created', { title: input.title }, member.userId)

    return issue
  }),

  update: protectedProcedure.input(updateIssueSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const data: Record<string, unknown> = {}
    const changes: Record<string, { from: unknown; to: unknown }> = {}

    if (input.title !== undefined) {
      changes.title = { from: existing.title, to: input.title }
      data.title = input.title
    }
    if (input.description !== undefined) {
      changes.description = { from: true, to: true }
      data.description = input.description
    }
    if (input.status !== undefined) {
      changes.status = { from: existing.status, to: input.status }
      data.status = input.status
    }
    if (input.priority !== undefined) {
      changes.priority = { from: existing.priority, to: input.priority }
      data.priority = input.priority
    }
    if (input.assigneeId !== undefined) {
      changes.assignee = { from: existing.assigneeId, to: input.assigneeId }
      data.assigneeId = input.assigneeId
    }
    if (input.dueDate !== undefined) {
      changes.dueDate = {
        from: existing.dueDate,
        to: input.dueDate ? new Date(input.dueDate) : null,
      }
      data.dueDate = input.dueDate ? new Date(input.dueDate) : null
    }
    if (input.sprintId !== undefined) {
      changes.sprint = { from: existing.sprintId, to: input.sprintId }
      data.sprintId = input.sprintId
    }

    const issue = await prisma.issue.update({
      where: { id: input.issueId },
      data,
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        reporter: { select: { id: true, name: true, avatarUrl: true } },
        labels: { include: { label: true } },
        sprint: { select: { id: true, name: true, status: true } },
      },
    })

    for (const [field, change] of Object.entries(changes)) {
      await createActivityLog(
        input.issueId,
        'issue',
        `${field}_changed`,
        { field, from: change.from, to: change.to },
        member.userId
      )
    }

    return issue
  }),

  delete: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: { project: { select: { workspaceId: true } } },
      })
      if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      await prisma.issue.update({
        where: { id: input.issueId },
        data: { deletedAt: new Date() },
      })

      return { success: true }
    }),

  getById: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const issue = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: {
          project: {
            select: { id: true, name: true, identifier: true, color: true, workspaceId: true },
          },
          assignee: { select: { id: true, name: true, avatarUrl: true, email: true } },
          reporter: { select: { id: true, name: true, avatarUrl: true, email: true } },
          labels: { include: { label: true } },
          sprint: {
            select: { id: true, name: true, status: true, startDate: true, endDate: true },
          },
          parent: { select: { id: true, identifier: true, title: true, status: true } },
          _count: {
            select: {
              comments: true,
              subIssues: { where: { deletedAt: null } },
              attachments: true,
            },
          },
        },
      })

      if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      return issue
    }),

  list: protectedProcedure.input(listIssuesSchema).query(async ({ ctx, input }) => {
    const { workspaceId } = await getProjectWorkspaceId(input.projectId)
    const member = await getMemberByClerkId(workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const where: Record<string, unknown> = {
      projectId: input.projectId,
      deletedAt: null,
      parentId: null,
    }

    if (input.status?.length) where.status = { in: input.status }
    if (input.priority?.length) where.priority = { in: input.priority }
    if (input.assigneeId) where.assigneeId = input.assigneeId
    if (input.sprintId) where.sprintId = input.sprintId
    if (input.search) where.title = { contains: input.search, mode: 'insensitive' }

    if (input.labelId) {
      const labelIssueIds = await prisma.issueLabel.findMany({
        where: { labelId: input.labelId },
        select: { issueId: true },
      })
      where.id = { in: labelIssueIds.map((l) => l.issueId) }
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          reporter: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
          sprint: { select: { id: true, name: true, status: true } },
          _count: { select: { comments: true, subIssues: { where: { deletedAt: null } } } },
        },
        orderBy: { [input.sortBy]: input.sortOrder },
        take: input.limit,
        skip: input.offset,
      }),
      prisma.issue.count({ where }),
    ])

    return { issues, total }
  }),

  updateStatus: protectedProcedure.input(updateStatusSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const issue = await prisma.issue.update({
      where: { id: input.issueId },
      data: { status: input.status },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    })

    await createActivityLog(
      input.issueId,
      'issue',
      'status_changed',
      { from: existing.status, to: input.status },
      member.userId
    )

    return issue
  }),

  updatePriority: protectedProcedure
    .input(updatePrioritySchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: { project: { select: { workspaceId: true } } },
      })
      if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const issue = await prisma.issue.update({
        where: { id: input.issueId },
        data: { priority: input.priority },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
        },
      })

      await createActivityLog(
        input.issueId,
        'issue',
        'priority_changed',
        { from: existing.priority, to: input.priority },
        member.userId
      )

      return issue
    }),

  assign: protectedProcedure.input(assignIssueSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const issue = await prisma.issue.update({
      where: { id: input.issueId },
      data: { assigneeId: input.assigneeId },
      include: {
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        labels: { include: { label: true } },
      },
    })

    await createActivityLog(
      input.issueId,
      'issue',
      'assigned',
      { from: existing.assigneeId, to: input.assigneeId },
      member.userId
    )

    return issue
  }),

  reorder: protectedProcedure.input(reorderIssueSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getMemberByClerkId(existing.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    return prisma.issue.update({
      where: { id: input.issueId },
      data: { order: input.order, status: input.status },
    })
  }),

  bulkUpdate: protectedProcedure.input(bulkUpdateSchema).mutation(async ({ ctx, input }) => {
    const firstId = input.issueIds[0]
    if (!firstId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'No issues provided' })

    const firstIssue = await prisma.issue.findUnique({
      where: { id: firstId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!firstIssue) throw new TRPCError({ code: 'NOT_FOUND' })

    const workspaceId = firstIssue.project?.workspaceId
    if (!workspaceId) throw new TRPCError({ code: 'NOT_FOUND' })

    const member = await getMemberByClerkId(workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const data: Record<string, unknown> = {}
    if (input.status) data.status = input.status
    if (input.priority) data.priority = input.priority
    if (input.assigneeId !== undefined) data.assigneeId = input.assigneeId
    if (input.sprintId !== undefined) data.sprintId = input.sprintId

    await prisma.issue.updateMany({
      where: { id: { in: input.issueIds }, deletedAt: null },
      data,
    })

    return { success: true, count: input.issueIds.length }
  }),

  addLabel: protectedProcedure
    .input(z.object({ issueId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const issue = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: { project: { select: { workspaceId: true } } },
      })
      if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const existing = await prisma.issueLabel.findUnique({
        where: { issueId_labelId: { issueId: input.issueId, labelId: input.labelId } },
      })
      if (existing) return existing

      return prisma.issueLabel.create({
        data: { issueId: input.issueId, labelId: input.labelId },
        include: { label: true },
      })
    }),

  removeLabel: protectedProcedure
    .input(z.object({ issueId: z.string(), labelId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const issue = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: { project: { select: { workspaceId: true } } },
      })
      if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      await prisma.issueLabel.delete({
        where: { issueId_labelId: { issueId: input.issueId, labelId: input.labelId } },
      })

      return { success: true }
    }),

  createSubIssue: protectedProcedure
    .input(createIssueSchema.extend({ parentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const parent = await prisma.issue.findUnique({
        where: { id: input.parentId },
        include: { project: { select: { id: true, identifier: true, workspaceId: true } } },
      })
      if (!parent || parent.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(parent.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const project = await prisma.project.update({
        where: { id: parent.projectId },
        data: { issueCount: { increment: 1 } },
        select: { identifier: true, issueCount: true },
      })

      const subIssue = await prisma.issue.create({
        data: {
          identifier: `${project.identifier}-${project.issueCount}`,
          title: input.title,
          status: input.status,
          priority: input.priority,
          projectId: parent.projectId,
          assigneeId: input.assigneeId ?? null,
          reporterId: member.userId,
          parentId: input.parentId,
          order: Date.now(),
        },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
        },
      })

      await createActivityLog(
        subIssue.id,
        'issue',
        'created',
        { title: input.title, parentId: input.parentId },
        member.userId
      )

      return subIssue
    }),

  listSubIssues: protectedProcedure
    .input(z.object({ issueId: z.string() }))
    .query(async ({ ctx, input }) => {
      const issue = await prisma.issue.findUnique({
        where: { id: input.issueId },
        include: { project: { select: { workspaceId: true } } },
      })
      if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

      const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      return prisma.issue.findMany({
        where: { parentId: input.issueId, deletedAt: null },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true, subIssues: { where: { deletedAt: null } } } },
        },
        orderBy: { order: 'asc' },
      })
    }),
})
