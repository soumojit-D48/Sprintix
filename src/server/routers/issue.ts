import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import { createActivityLog } from '@/lib/activity-log'
import { notifyAssigned, notifyStatusChanged } from '@/lib/notifications'
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

    await createActivityLog(prisma, issue.id, 'issue', 'created', { title: input.title }, member.userId)

    if (input.assigneeId && input.assigneeId !== member.userId) {
      const actor = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { name: true },
      })
      await notifyAssigned(
        { id: issue.id, identifier: issue.identifier, title: issue.title },
        input.assigneeId,
        actor?.name || 'Someone'
      )
    }

    await triggerEvent(`private-workspace-${workspaceId}`, 'issue:created', { issueId: issue.id, projectId: issue.projectId })

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
        prisma,
        input.issueId,
        'issue',
        `${field}_changed`,
        { field, from: change.from, to: change.to },
        member.userId
      )
    }

    await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })

    if (changes.status && issue.assignee?.id && issue.assignee.id !== member.userId) {
      const actor = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { name: true },
      })
      await notifyStatusChanged(
        { id: issue.id, identifier: issue.identifier, title: issue.title },
        String(changes.status.from),
        String(changes.status.to),
        issue.assignee.id,
        actor?.name || 'Someone'
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

      await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:deleted', { issueId: input.issueId, projectId: existing.projectId })

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
      prisma,
      input.issueId,
      'issue',
      'status_changed',
      { from: existing.status, to: input.status },
      member.userId
    )

    await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })

    if (existing.status !== input.status && issue.assignee?.id && issue.assignee.id !== member.userId) {
      const actor = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { name: true },
      })
      await notifyStatusChanged(
        { id: issue.id, identifier: issue.identifier, title: issue.title },
        existing.status,
        input.status,
        issue.assignee.id,
        actor?.name || 'Someone'
      )
    }

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
        prisma,
        input.issueId,
        'issue',
        'priority_changed',
        { from: existing.priority, to: input.priority },
        member.userId
      )

    await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })

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
      prisma,
      input.issueId,
      'issue',
      'assigned',
      { from: existing.assigneeId, to: input.assigneeId },
      member.userId
    )

    // Send notification
    const actor = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { name: true },
    })

    if (issue.assigneeId && issue.assigneeId !== member.userId) {
      await notifyAssigned(
        { id: issue.id, identifier: issue.identifier, title: issue.title },
        issue.assigneeId,
        actor?.name || 'Someone'
      )
    }

    await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })

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

    const updated = await prisma.issue.update({
      where: { id: input.issueId },
      data: { order: input.order, status: input.status },
    })

    if (existing.status !== input.status) {
      await createActivityLog(
        prisma,
        input.issueId,
        'issue',
        'status_changed',
        { from: existing.status, to: input.status },
        member.userId
      )
    }

    await triggerEvent(`private-workspace-${existing.project.workspaceId}`, 'issue:updated', { issueId: input.issueId, projectId: existing.projectId })

    return updated
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

    // Emit event for all issues updated
    for (const id of input.issueIds) {
      await triggerEvent(`private-workspace-${workspaceId}`, 'issue:updated', { issueId: id, projectId: firstIssue.projectId })
    }

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

      const created = await prisma.issueLabel.create({
        data: { issueId: input.issueId, labelId: input.labelId },
        include: { label: true },
      })
      
      await triggerEvent(`private-workspace-${issue.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })
      
      return created
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

      await triggerEvent(`private-workspace-${issue.project.workspaceId}`, 'issue:updated', { issueId: issue.id, projectId: issue.projectId })

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
        prisma,
        subIssue.id,
        'issue',
        'created',
        { title: input.title, parentId: input.parentId },
        member.userId
      )

      await triggerEvent(`private-workspace-${parent.project.workspaceId}`, 'issue:created', { issueId: subIssue.id, projectId: subIssue.projectId })

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

  // Returns all issues assigned to the current user across an entire workspace
  listForCurrentUser: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await getMemberByClerkId(input.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const user = await prisma.user.findFirst({
        where: { clerkId: ctx.userId! },
        select: { id: true },
      })
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

      return prisma.issue.findMany({
        where: {
          project: { workspaceId: input.workspaceId },
          assigneeId: user.id,
          deletedAt: null,
        },
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          reporter: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
          sprint: { select: { id: true, name: true, status: true } },
          project: { select: { id: true, name: true, identifier: true, color: true } },
          _count: { select: { comments: true, subIssues: { where: { deletedAt: null } } } },
        },
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      })
    }),

  // Returns all backlog issues (no sprint) for a project
  listBacklog: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        search: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { workspaceId } = await getProjectWorkspaceId(input.projectId)
      const member = await getMemberByClerkId(workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const where: Record<string, unknown> = {
        projectId: input.projectId,
        sprintId: null,
        deletedAt: null,
        parentId: null,
        status: { notIn: ['DONE', 'CANCELLED'] },
      }

      if (input.search) {
        where.title = { contains: input.search, mode: 'insensitive' }
      }

      const issues = await prisma.issue.findMany({
        where,
        include: {
          assignee: { select: { id: true, name: true, avatarUrl: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true, subIssues: { where: { deletedAt: null } } } },
        },
        orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      })

      return issues
    }),
})
