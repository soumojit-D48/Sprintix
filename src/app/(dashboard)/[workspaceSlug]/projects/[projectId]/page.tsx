import { redirect } from 'next/navigation'

export default async function ProjectRootPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>
}) {
  const { workspaceSlug, projectId } = await params
  redirect(`/${workspaceSlug}/projects/${projectId}/board`)
}
