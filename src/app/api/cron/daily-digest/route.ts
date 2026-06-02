import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendDailyDigest } from '@/lib/email'

const CRON_SECRET = process.env.CRON_SECRET || ''

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      notificationPreferences: {
        path: ['dailyDigest'],
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
                  issues: {
                    where: {
                      deletedAt: null,
                      updatedAt: {
                        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                      },
                    },
                    include: {
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
      const digestItems: {
        projectName: string
        items: {
          type: 'status_change' | 'new_comment' | 'new_assignment'
          issueIdentifier: string
          issueTitle: string
          summary: string
        }[]
      }[] = []

      for (const project of workspace.projects) {
        const projectItems: {
          type: 'status_change' | 'new_comment' | 'new_assignment'
          issueIdentifier: string
          issueTitle: string
          summary: string
        }[] = []

        for (const issue of project.issues) {
          const recentActivity = await prisma.activityLog.findFirst({
            where: {
              entityId: issue.id,
              createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            },
            orderBy: { createdAt: 'desc' },
          })

          if (recentActivity) {
            const meta = recentActivity.metadata as Record<string, unknown>
            let summary = ''
            let type: 'status_change' | 'new_comment' | 'new_assignment' = 'status_change'

            if (recentActivity.action === 'status_changed' && meta.from && meta.to) {
              summary = `Status changed from ${String(meta.from).replace(/_/g, ' ').toLowerCase()} to ${String(meta.to).replace(/_/g, ' ').toLowerCase()}`
            } else if (recentActivity.action === 'commented') {
              type = 'new_comment'
              summary = 'New comment added'
            } else if (recentActivity.action === 'assigned') {
              type = 'new_assignment'
              summary = meta.from
                ? 'Reassigned to another team member'
                : 'Assigned to you'
            } else {
              summary = `${recentActivity.action.replace(/_/g, ' ')}`
            }

            projectItems.push({
              type,
              issueIdentifier: issue.identifier,
              issueTitle: issue.title,
              summary,
            })
          }
        }

        if (projectItems.length > 0) {
          digestItems.push({
            projectName: project.name,
            items: projectItems,
          })
        }
      }

      if (digestItems.length > 0) {
        await sendDailyDigest({
          email: user.email,
          userName: user.name,
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
          items: digestItems,
        })
        sentCount++
      }
    }
  }

  return NextResponse.json({ success: true, sent: sentCount })
}
