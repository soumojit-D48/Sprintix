import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendWeeklySummary } from '@/lib/email'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      notificationPreferences: {
        path: ['weeklySummary'],
        equals: true,
      },
    },
    include: {
      workspaceMembers: {
        include: {
          workspace: {
            include: {
              projects: {
                include: {
                  sprints: {
                    where: { status: 'ACTIVE' },
                    include: {
                      issues: {
                        where: { deletedAt: null },
                        select: { id: true, status: true },
                      },
                    },
                  },
                  issues: {
                    where: {
                      deletedAt: null,
                      dueDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                      },
                    },
                    select: {
                      id: true,
                      identifier: true,
                      title: true,
                      dueDate: true,
                      project: { select: { name: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  let sentCount = 0

  for (const user of users) {
    for (const membership of user.workspaceMembers) {
      const workspace = membership.workspace

      // Find active sprint progress
      let sprintProgress: {
        name: string
        percentComplete: number
        completedIssues: number
        totalIssues: number
      } | null = null

      for (const project of workspace.projects) {
        const activeSprint = project.sprints[0]
        if (activeSprint && activeSprint.issues.length > 0) {
          const totalIssues = activeSprint.issues.length
          const completedIssues = activeSprint.issues.filter(
            (i) => i.status === 'DONE' || i.status === 'CANCELLED'
          ).length
          sprintProgress = {
            name: activeSprint.name,
            percentComplete: Math.round((completedIssues / totalIssues) * 100),
            completedIssues,
            totalIssues,
          }
          break
        }
      }

      // Calculate issues completed this week
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const completedThisWeek = await prisma.activityLog.count({
        where: {
          action: 'status_changed',
          userId: user.id,
          createdAt: { gte: weekAgo },
        },
      })

      // Get upcoming due dates
      const upcomingDueDates = workspace.projects
        .flatMap((p) => p.issues)
        .filter((i) => i.dueDate)
        .slice(0, 10)
        .map((i) => ({
          issueIdentifier: i.identifier,
          issueTitle: i.title,
          dueDate: i.dueDate!.toLocaleDateString(),
          projectName: i.project.name,
        }))

      // Find most active member
      const mostActiveResult = await prisma.activityLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: weekAgo },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      let mostActiveMember = 'N/A'
      if (mostActiveResult.length > 0) {
        const topUser = await prisma.user.findUnique({
          where: { id: mostActiveResult[0]!.userId },
          select: { name: true },
        })
        if (topUser) mostActiveMember = topUser.name
      }

      await sendWeeklySummary({
        email: user.email,
        userName: user.name,
        workspaceName: workspace.name,
        workspaceSlug: workspace.slug,
        sprintProgress,
        issuesCompletedThisWeek: completedThisWeek,
        weeklyGoal: workspace.projects.length * 5, // rough estimate: 5 issues/project/week
        upcomingDueDates,
        mostActiveMember,
      })
      sentCount++
    }
  }

  return NextResponse.json({ success: true, sent: sentCount })
}
