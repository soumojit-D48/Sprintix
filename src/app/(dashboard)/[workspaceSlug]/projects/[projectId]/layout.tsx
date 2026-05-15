import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { ProjectLayoutClient } from './project-layout-client'

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

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  })

  if (!user) redirect('/sign-in')

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id,
      workspace: { slug: workspaceSlug },
    },
    select: { id: true, role: true },
  })

  if (!membership) redirect(`/${workspaceSlug}`)

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: {
        select: {
          issues: { where: { deletedAt: null } },
        },
      },
      issues: {
        where: { deletedAt: null },
        select: { id: true, status: true },
      },
      sprints: {
        where: { status: 'ACTIVE' },
        take: 1,
        select: { id: true, name: true, status: true },
      },
    },
  })

  if (!project) notFound()

  const totalIssues = project.issues.length
  const doneIssues = project.issues.filter((i) => i.status === 'DONE').length
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
      activeSprint={project.sprints[0] ?? null}
      workspaceSlug={workspaceSlug}
    >
      {children}
    </ProjectLayoutClient>
  )
}
