import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type Props = {
  params: Promise<{
    workspaceSlug: string
  }>
}

export default async function WorkspacePage({ params }: Props) {
  const { workspaceSlug } = await params
  const { userId } = await auth()
  if (!userId) {
    redirect('/sign-in')
  }

  const workspaceData = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      projects: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!workspaceData) {
    return notFound()
  }

  const membership = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspaceData.id,
      user: {
        clerkId: userId,
      },
    },
  })

  if (!membership) {
    return notFound()
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{workspaceData.name}</h1>
        <p className="mt-2 text-sm text-gray-600">Workspace slug: {workspaceData.slug}</p>
      </div>

      <section className="space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Projects</h2>
          {workspaceData.projects.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              No projects yet. Create one from onboarding or the app navigation.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {workspaceData.projects.map((project) => (
                <li
                  key={project.id}
                  className="rounded-lg border border-gray-200 p-4 hover:border-blue-500"
                >
                  <Link
                    href={`/${workspaceData.slug}/${project.identifier}`}
                    className="block text-lg font-medium text-blue-600 hover:underline"
                  >
                    {project.name} ({project.identifier})
                  </Link>
                  <p className="mt-1 text-sm text-gray-600">Color: {project.color}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  )
}
