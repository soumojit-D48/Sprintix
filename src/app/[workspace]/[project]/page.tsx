import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

type Props = {
    params: Promise<{
        workspace: string
        project: string
    }>
}

export default async function ProjectPage({ params }: Props) {
    const { workspace, project } = await params
    const { userId } = await auth()
    if (!userId) {
        redirect('/sign-in')
    }

    const workspaceData = await prisma.workspace.findUnique({
        where: { slug: workspace },
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

    const projectData = await prisma.project.findFirst({
        where: {
            workspaceId: workspaceData.id,
            identifier: project.toUpperCase(),
        },
    })

    if (!projectData) {
        return notFound()
    }

    return (
        <div className="container mx-auto py-10 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold">
                    {projectData.name} ({projectData.identifier})
                </h1>
                <p className="mt-2 text-sm text-gray-600">Workspace: {workspaceData.name}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Project details</h2>
                <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <p>
                        <strong>Project code:</strong> {projectData.identifier}
                    </p>
                    <p>
                        <strong>Color:</strong>{' '}
                        <span
                            className="inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: projectData.color ?? '#374151' }}
                        >
                            {projectData.color ?? 'None'}
                        </span>
                    </p>
                    <p>
                        <strong>Created:</strong> {projectData.createdAt.toISOString()}
                    </p>
                </div>
            </div>

            <div className="mt-6">
                <Link href={`/${workspaceData.slug}`} className="text-blue-600 hover:underline">
                    Back to workspace
                </Link>
            </div>
        </div>
    )
}
