import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import {
  workspaceAnalyticsSchema,
  teamWorkloadSchema,
  projectAnalyticsSchema,
  burndownSchema,
  velocitySchema,
  overdueIssuesSchema,
} from '@/lib/validations/analytics'

function getWeekRange() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const nextMonday = new Date(monday)
  nextMonday.setDate(monday.getDate() + 7)
  return { weekStart: monday, weekEnd: nextMonday }
}

function getLastWeekRange() {
  const { weekStart } = getWeekRange()
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(weekStart.getDate() - 7)
  return { weekStart: lastWeekStart, weekEnd: weekStart }
}

export const analyticsRouter = router({
  workspaceSummary: protectedProcedure
    .input(workspaceAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const workspace = await prisma.workspace.findFirst({
        where: {
          OR: [
            { slug: input.workspaceSlug },
            { previousSlugs: { has: input.workspaceSlug } },
          ],
        },
        select: { id: true },
      })
      if (!workspace) throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace not found.' })

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: workspace.id, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const { weekStart, weekEnd } = getWeekRange()
      const lastWeek = getLastWeekRange()

      const [openIssueCount, thisWeekCompleted, lastWeekCompleted, overdueCount, memberCount] =
        await Promise.all([
          prisma.issue.count({
            where: {
              project: { workspaceId: workspace.id },
              deletedAt: null,
              status: { notIn: ['DONE', 'CANCELLED'] },
            },
          }),
          prisma.issue.count({
            where: {
              project: { workspaceId: workspace.id },
              status: 'DONE',
              updatedAt: { gte: weekStart, lt: weekEnd },
              deletedAt: null,
            },
          }),
          prisma.issue.count({
            where: {
              project: { workspaceId: workspace.id },
              status: 'DONE',
              updatedAt: { gte: lastWeek.weekStart, lt: lastWeek.weekEnd },
              deletedAt: null,
            },
          }),
          prisma.issue.count({
            where: {
              project: { workspaceId: workspace.id },
              deletedAt: null,
              status: { notIn: ['DONE', 'CANCELLED'] },
              dueDate: { not: null, lt: new Date() },
            },
          }),
          prisma.workspaceMember.count({
            where: { workspaceId: workspace.id },
          }),
        ])

      const trend =
        lastWeekCompleted > 0
          ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
          : thisWeekCompleted > 0
            ? 100
            : 0

      return {
        openIssueCount,
        thisWeekCompleted,
        lastWeekCompleted,
        overdueCount,
        memberCount,
        trend,
      }
    }),

  teamWorkload: protectedProcedure
    .input(teamWorkloadSchema)
    .query(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: input.workspaceId, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const allMembers = await prisma.workspaceMember.findMany({
        where: { workspaceId: input.workspaceId },
        include: {
          user: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      })

      const workload = await Promise.all(
        allMembers.map(async (m) => {
          const [openCount, inProgressCount, overdueCount] = await Promise.all([
            prisma.issue.count({
              where: {
                assigneeId: m.user.id,
                project: { workspaceId: input.workspaceId },
                deletedAt: null,
                status: { notIn: ['DONE', 'CANCELLED'] },
              },
            }),
            prisma.issue.count({
              where: {
                assigneeId: m.user.id,
                project: { workspaceId: input.workspaceId },
                deletedAt: null,
                status: { in: ['IN_PROGRESS', 'IN_REVIEW'] },
              },
            }),
            prisma.issue.count({
              where: {
                assigneeId: m.user.id,
                project: { workspaceId: input.workspaceId },
                deletedAt: null,
                status: { notIn: ['DONE', 'CANCELLED'] },
                dueDate: { not: null, lt: new Date() },
              },
            }),
          ])

          return {
            userId: m.user.id,
            name: m.user.name,
            avatarUrl: m.user.avatarUrl,
            openCount,
            inProgressCount,
            overdueCount,
          }
        })
      )

      return workload.sort((a, b) => b.openCount - a.openCount)
    }),

  projectSummary: protectedProcedure
    .input(projectAnalyticsSchema)
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, workspaceId: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: project.workspaceId, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const [issuesByStatus, issuesByPriority] = await Promise.all([
        prisma.issue.groupBy({
          by: ['status'],
          where: { projectId: input.projectId, deletedAt: null },
          _count: true,
        }),
        prisma.issue.groupBy({
          by: ['priority'],
          where: { projectId: input.projectId, deletedAt: null },
          _count: true,
        }),
      ])

      const statusOrder = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']
      const priorityOrder = ['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']

      const statusMap = Object.fromEntries(issuesByStatus.map((s) => [s.status, s._count]))
      const priorityMap = Object.fromEntries(issuesByPriority.map((p) => [p.priority, p._count]))

      return {
        issuesByStatus: statusOrder.map((status) => ({
          status,
          count: statusMap[status] ?? 0,
        })),
        issuesByPriority: priorityOrder.map((priority) => ({
          priority,
          count: priorityMap[priority] ?? 0,
        })),
      }
    }),

  burndown: protectedProcedure
    .input(burndownSchema)
    .query(async ({ ctx, input }) => {
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

      const sprintDays =
        Math.ceil(
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
        sprintName: sprint.name,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        totalIssues,
        doneIssues,
        cancelledIssues,
        completionRate:
          activeIssues > 0 ? Math.round((doneIssues / activeIssues) * 100) : 0,
        burndownData,
      }
    }),

  velocity: protectedProcedure
    .input(velocitySchema)
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findUnique({
        where: { id: input.projectId },
        select: { id: true, workspaceId: true },
      })
      if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' })

      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: project.workspaceId, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const completedSprints = await prisma.sprint.findMany({
        where: { projectId: input.projectId, status: 'COMPLETED' },
        include: {
          issues: {
            where: { deletedAt: null },
            select: { id: true, status: true },
          },
        },
        orderBy: { endDate: 'desc' },
        take: input.sprintCount,
      })

      const velocityData = completedSprints
        .map((s) => {
          const total = s.issues.length
          const done = s.issues.filter((i) => i.status === 'DONE').length
          const cancelled = s.issues.filter((i) => i.status === 'CANCELLED').length
          const active = total - cancelled
          return {
            sprintId: s.id,
            sprintName: s.name,
            startDate: s.startDate,
            endDate: s.endDate,
            totalIssues: total,
            completedIssues: done,
            cancelledIssues: cancelled,
            completionRate: active > 0 ? Math.round((done / active) * 100) : 0,
          }
        })
        .reverse()

      const averageVelocity =
        velocityData.length > 0
          ? Math.round(
              velocityData.reduce((sum, s) => sum + s.completedIssues, 0) / velocityData.length
            )
          : 0

      return {
        velocityData,
        averageVelocity,
        sprintCount: velocityData.length,
      }
    }),

  overdue: protectedProcedure
    .input(overdueIssuesSchema)
    .query(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: { workspaceId: input.workspaceId, user: { clerkId: ctx.userId } },
      })
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const overdueIssues = await prisma.issue.findMany({
        where: {
          project: { workspaceId: input.workspaceId },
          deletedAt: null,
          status: { notIn: ['DONE', 'CANCELLED'] },
          dueDate: { not: null, lt: new Date() },
        },
        include: {
          assignee: {
            select: { id: true, name: true, avatarUrl: true },
          },
          project: {
            select: { id: true, name: true, identifier: true, color: true },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: input.limit,
      })

      return overdueIssues.map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        status: issue.status,
        priority: issue.priority,
        dueDate: issue.dueDate!,
        daysOverdue: Math.floor(
          (Date.now() - issue.dueDate!.getTime()) / (1000 * 60 * 60 * 24)
        ),
        assignee: issue.assignee,
        project: {
          id: issue.project.id,
          name: issue.project.name,
          identifier: issue.project.identifier,
          color: issue.project.color,
        },
      }))
    }),
})
