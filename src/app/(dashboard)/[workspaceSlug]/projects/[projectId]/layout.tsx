import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProjectLayoutClient } from './project-layout-client'

export const dynamic = 'force-dynamic'

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workspaceSlug: string; projectId: string }>
}) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { workspaceSlug, projectId } = await params

  let user
  try {
    user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    })
  } catch (e) {
    console.error('[ProjectLayout] Error fetching user:', e)
    throw e
  }

  if (!user) redirect('/sign-in')

  let membership
  try {
    membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: user.id,
        workspace: { slug: workspaceSlug },
      },
      select: { id: true, role: true },
    })
  } catch (e) {
    console.error('[ProjectLayout] Error fetching membership:', e)
    throw e
  }

  if (!membership) redirect(`/${workspaceSlug}`)

  let project
  try {
    project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        identifier: true,
        color: true,
        status: true,
        leadId: true,
      },
    })
  } catch (e) {
    console.error('[ProjectLayout] Error fetching project:', e)
    throw e
  }

  if (!project) {
    console.error(`[ProjectLayout] Project not found for id: ${projectId} in workspace: ${workspaceSlug}`)
    notFound()
  }

  const [activeSprints] = await Promise.all([
    prisma.sprint.findMany({
      where: { projectId, status: 'ACTIVE' },
      take: 1,
      select: { id: true, name: true, status: true },
    }),
  ])

  const issueCounts = await prisma.issue.groupBy({
    by: ['status'],
    where: { projectId, deletedAt: null },
    _count: true,
  })

  const countsMap: Record<string, number> = {}
  for (const item of issueCounts) {
    countsMap[item.status] = item._count
  }
  const totalIssues = Object.values(countsMap).reduce((s, v) => s + v, 0)
  const doneIssues = countsMap['DONE'] ?? 0
  const progress = totalIssues > 0 ? Math.round((doneIssues / totalIssues) * 100) : 0

  let lead = null
  if (project.leadId) {
    lead = await prisma.user.findUnique({
      where: { id: project.leadId },
      select: { id: true, name: true, avatarUrl: true },
    })
  }

  return (
    <ProjectLayoutClient
      project={{
        id: project.id,
        name: project.name,
        identifier: project.identifier,
        color: project.color ?? '#3B82F6',
        status: project.status,
        lead,
        progress,
        totalIssueCount: totalIssues,
      }}
      activeSprint={activeSprints[0] ?? null}
      workspaceSlug={workspaceSlug}
    >
      {children}
    </ProjectLayoutClient>
  )
}
