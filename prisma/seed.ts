import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await prisma.issueLabel.deleteMany()
  await prisma.activityLog.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.issue.deleteMany()
  await prisma.sprint.deleteMany()
  await prisma.project.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  // Create a test user
  const user = await prisma.user.create({
    data: {
      clerkId: 'seed_user_1',
      email: 'test@sprintix.app',
      name: 'Test User',
    },
  })

  // Create a workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Corp',
      slug: 'acme',
      plan: 'FREE',
    },
  })

  // Add user as owner
  await prisma.workspaceMember.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'OWNER',
    },
  })

  // Create a project
  const project = await prisma.project.create({
    data: {
      name: 'Engineering',
      identifier: 'ENG',
      workspaceId: workspace.id,
      color: '#6366f1',
    },
  })

  // Create some issues
  await prisma.issue.createMany({
    data: [
      {
        identifier: 'ENG-1',
        title: 'Set up project infrastructure',
        status: 'DONE',
        priority: 'HIGH',
        projectId: project.id,
        reporterId: user.id,
        order: 1,
      },
      {
        identifier: 'ENG-2',
        title: 'Design database schema',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        projectId: project.id,
        reporterId: user.id,
        assigneeId: user.id,
        order: 2,
      },
      {
        identifier: 'ENG-3',
        title: 'Build authentication flow',
        status: 'TODO',
        priority: 'MEDIUM',
        projectId: project.id,
        reporterId: user.id,
        order: 3,
      },
      {
        identifier: 'ENG-4',
        title: 'Create kanban board UI',
        status: 'BACKLOG',
        priority: 'LOW',
        projectId: project.id,
        reporterId: user.id,
        order: 4,
      },
    ],
  })

  console.log('✅ Seed complete!')
  console.log(`   User: ${user.email}`)
  console.log(`   Workspace: ${workspace.slug}`)
  console.log(`   Project: ${project.identifier}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })