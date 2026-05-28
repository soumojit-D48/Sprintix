import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import {
  createSprintSchema,
  updateSprintSchema,
  startSprintSchema,
  closeSprintSchema,
  deleteSprintSchema,
  addIssueToSprintSchema,
  removeIssueFromSprintSchema,
  listSprintsSchema,
  getSprintByIdSchema,
  getSprintStatsSchema,
  listWorkspaceSprintsSchema,
} from '@/lib/validations/sprint'

async function getSprintWorkspaceId(sprintId: string) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { project: { select: { workspaceId: true } } },
  })
  if (!sprint) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sprint not found.' })
  return sprint
}

async function requireAdmin(workspaceId: string, clerkId: string) {
  const member = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId,
      user: { clerkId },
      role: { in: ['OWNER', 'ADMIN'] },
    },
  })
  if (!member) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only admins and owners can perform this action.',
    })
  }
  return member
}

export const sprintRouter = router({
  create: protectedProcedure.input(createSprintSchema).mutation(async ({ ctx, input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, workspaceId: true },
    })
    if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })

    await requireAdmin(project.workspaceId, ctx.userId!)

    if (new Date(input.endDate) <= new Date(input.startDate)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End date must be after start date.',
      })
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: input.name,
        projectId: input.projectId,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
      },
      include: {
        project: { select: { id: true, name: true, identifier: true } },
      },
    })

    await triggerEvent(`private-workspace-${project.workspaceId}`, 'sprint:updated', {
      sprintId: sprint.id,
      projectId: project.id,
    })

    return sprint
  }),

  update: protectedProcedure.input(updateSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status !== 'PLANNED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only planned sprints can be edited.',
      })
    }

    const data: Record<string, unknown> = {}
    if (input.name !== undefined) data.name = input.name
    if (input.startDate !== undefined) data.startDate = new Date(input.startDate)
    if (input.endDate !== undefined) data.endDate = new Date(input.endDate)

    if (data.startDate && data.endDate && (data.endDate as Date) <= (data.startDate as Date)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'End date must be after start date.',
      })
    }

    const updated = await prisma.sprint.update({
      where: { id: input.sprintId },
      data,
      include: {
        project: { select: { id: true, name: true, identifier: true } },
      },
    })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: updated.id,
      projectId: updated.projectId,
    })

    return updated
  }),

  start: protectedProcedure.input(startSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status !== 'PLANNED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only planned sprints can be started.',
      })
    }

    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: 'ACTIVE' },
    })
    if (activeSprint) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `There is already an active sprint: "${activeSprint.name}". Close it before starting a new one.`,
      })
    }

    const updated = await prisma.sprint.update({
      where: { id: input.sprintId },
      data: { status: 'ACTIVE' },
      include: {
        project: { select: { id: true, name: true, identifier: true } },
        _count: { select: { issues: true } },
      },
    })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: updated.id,
      projectId: updated.projectId,
    })

    return updated
  }),

  close: protectedProcedure.input(closeSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status !== 'ACTIVE') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only active sprints can be closed.',
      })
    }

    const issues = await prisma.issue.findMany({
      where: { sprintId: input.sprintId, deletedAt: null },
      select: { id: true, status: true },
    })

    const incompleteIssueIds = issues
      .filter((i) => i.status !== 'DONE' && i.status !== 'CANCELLED')
      .map((i) => i.id)

    await prisma.$transaction(async (tx) => {
      await tx.sprint.update({
        where: { id: input.sprintId },
        data: { status: 'COMPLETED' },
      })

      if (incompleteIssueIds.length > 0) {
        if (input.incompleteDisposition === 'BACKLOG') {
          await tx.issue.updateMany({
            where: { id: { in: incompleteIssueIds } },
            data: { sprintId: null },
          })
        } else if (input.incompleteDisposition === 'NEW_SPRINT' && input.newSprintId) {
          await tx.issue.updateMany({
            where: { id: { in: incompleteIssueIds } },
            data: { sprintId: input.newSprintId },
          })
        }
      }
    })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: input.sprintId,
      projectId: sprint.projectId,
    })

    return { success: true, incompleteIssueIds }
  }),

  delete: protectedProcedure.input(deleteSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status !== 'PLANNED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Only planned sprints can be deleted.',
      })
    }

    await prisma.issue.updateMany({
      where: { sprintId: input.sprintId },
      data: { sprintId: null },
    })

    await prisma.sprint.delete({ where: { id: input.sprintId } })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: input.sprintId,
      projectId: sprint.projectId,
    })

    return { success: true }
  }),

  listByWorkspace: protectedProcedure
    .input(listWorkspaceSprintsSchema)
    .query(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: input.workspaceId, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const sprints = await prisma.sprint.findMany({
        where: {
          project: { workspaceId: input.workspaceId },
        },
        include: {
          project: { select: { id: true, name: true, identifier: true, color: true } },
          _count: { select: { issues: { where: { deletedAt: null } } } },
          issues: {
            where: { deletedAt: null },
            select: { id: true, status: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      })

      return sprints.map((s) => {
        const totalIssues = s.issues.length
        const doneIssues = s.issues.filter((i) => i.status === 'DONE').length
        const cancelledIssues = s.issues.filter((i) => i.status === 'CANCELLED').length
        const activeIssues = totalIssues - cancelledIssues
        const completionRate = activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0

        return {
          id: s.id,
          name: s.name,
          projectId: s.projectId,
          project: s.project,
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          createdAt: s.createdAt,
          issueCount: s._count.issues,
          completedIssueCount: doneIssues,
          completionRate,
        }
      })
    }),

  list: protectedProcedure.input(listSprintsSchema).query(async ({ ctx, input }) => {
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, workspaceId: true },
    })
    if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: project.workspaceId, user: { clerkId: ctx.userId } },
    })
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const sprints = await prisma.sprint.findMany({
      where: { projectId: input.projectId },
      include: {
        _count: { select: { issues: { where: { deletedAt: null } } } },
        issues: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    })

    return sprints.map((s) => {
      const totalIssues = s.issues.length
      const doneIssues = s.issues.filter((i) => i.status === 'DONE').length
      const cancelledIssues = s.issues.filter((i) => i.status === 'CANCELLED').length
      const activeIssues = totalIssues - cancelledIssues
      const completionRate = activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0

      return {
        id: s.id,
        name: s.name,
        projectId: s.projectId,
        status: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        createdAt: s.createdAt,
        issueCount: s._count.issues,
        completedIssueCount: doneIssues,
        completionRate,
      }
    })
  }),

  getById: protectedProcedure.input(getSprintByIdSchema).query(async ({ ctx, input }) => {
    const sprint = await prisma.sprint.findUnique({
      where: { id: input.sprintId },
      include: {
        project: { select: { id: true, name: true, identifier: true, color: true, workspaceId: true } },
        issues: {
          where: { deletedAt: null },
          include: {
            assignee: { select: { id: true, name: true, avatarUrl: true } },
            labels: { include: { label: true } },
            _count: { select: { comments: true, subIssues: { where: { deletedAt: null } } } },
          },
          orderBy: [{ status: 'asc' }, { order: 'asc' }],
        },
      },
    })
    if (!sprint) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sprint not found.' })

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: sprint.project.workspaceId, user: { clerkId: ctx.userId } },
    })
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const totalIssues = sprint.issues.length
    const doneIssues = sprint.issues.filter((i) => i.status === 'DONE').length
    const cancelledIssues = sprint.issues.filter((i) => i.status === 'CANCELLED').length
    const activeIssues = totalIssues - cancelledIssues
    const completionRate = activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0

    return {
      ...sprint,
      project: { ...sprint.project },
      completionRate,
      completedIssueCount: doneIssues,
      totalIssueCount: totalIssues,
    }
  }),

  addIssue: protectedProcedure.input(addIssueToSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status === 'COMPLETED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot add issues to a completed sprint.',
      })
    }

    await prisma.issue.updateMany({
      where: { id: { in: input.issueIds }, deletedAt: null },
      data: { sprintId: input.sprintId },
    })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: input.sprintId,
      projectId: sprint.projectId,
    })

    return { success: true, count: input.issueIds.length }
  }),

  removeIssue: protectedProcedure.input(removeIssueFromSprintSchema).mutation(async ({ ctx, input }) => {
    const sprint = await getSprintWorkspaceId(input.sprintId)
    await requireAdmin(sprint.project.workspaceId, ctx.userId!)

    if (sprint.status === 'COMPLETED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot remove issues from a completed sprint.',
      })
    }

    await prisma.issue.updateMany({
      where: { id: { in: input.issueIds }, sprintId: input.sprintId, deletedAt: null },
      data: { sprintId: null },
    })

    await triggerEvent(`private-workspace-${sprint.project.workspaceId}`, 'sprint:updated', {
      sprintId: input.sprintId,
      projectId: sprint.projectId,
    })

    return { success: true, count: input.issueIds.length }
  }),

  getStats: protectedProcedure.input(getSprintStatsSchema).query(async ({ ctx, input }): Promise<{
    sprintId: string
    totalIssues: number
    doneIssues: number
    cancelledIssues: number
    completionRate: number
    burndownData: { date: string; ideal: number; actual: number }[]
    daysElapsed: number
  }> => {
    const sprint = await prisma.sprint.findUnique({
      where: { id: input.sprintId },
      include: {
        project: { select: { workspaceId: true } },
        issues: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
    })
    if (!sprint) throw new TRPCError({ code: 'NOT_FOUND', message: 'Sprint not found.' })

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: sprint.project.workspaceId, user: { clerkId: ctx.userId } },
    })
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const totalIssues = sprint.issues.length
    const doneIssues = sprint.issues.filter((i) => i.status === 'DONE').length
    const cancelledIssues = sprint.issues.filter((i) => i.status === 'CANCELLED').length
    const activeIssues = totalIssues - cancelledIssues
    const completionRate = activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0

    const sprintDays = Math.ceil(
      (sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1

    const statusChanges = await prisma.activityLog.findMany({
      where: {
        entityType: 'issue',
        action: 'status_changed',
        issue: { sprintId: input.sprintId },
        createdAt: { gte: sprint.startDate, lte: sprint.endDate },
      },
      orderBy: { createdAt: 'asc' },
    })

    const burndownData: { date: string; ideal: number; actual: number }[] = []
    let remainingIssues = activeIssues

    for (let i = 0; i < sprintDays; i++) {
      const date = new Date(sprint.startDate)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]!

      const completedOnDay = statusChanges.filter(
        (log) =>
          log.createdAt.toISOString().split('T')[0] === dateStr &&
          (log.metadata as { to?: string })?.to === 'DONE'
      ).length

      remainingIssues -= completedOnDay
      remainingIssues = Math.max(0, remainingIssues)

      const daysLeft = sprintDays - i - 1
      const idealRemaining = daysLeft > 0 ? (activeIssues * daysLeft) / (sprintDays - 1) : 0

      burndownData.push({
        date: dateStr,
        ideal: Math.round(idealRemaining),
        actual: remainingIssues,
      })
    }

    return {
      sprintId: input.sprintId,
      totalIssues,
      doneIssues,
      cancelledIssues,
      completionRate,
      burndownData,
      daysElapsed: sprintDays,
    }
  }),
})
