import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()

  if (!userId) {
    redirect('/sign-in')
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      workspaceMembers: {
        include: {
          workspace: true,
        },
      },
    },
  })

  if (user && user.workspaceMembers.length > 0) {
    const firstMember = user.workspaceMembers[0]
    if (firstMember) {
      redirect(`/${firstMember.workspace.slug}`)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-white">
        <div className="container mx-auto flex h-16 items-center px-4">
          <h1 className="text-xl font-bold">Sprintix</h1>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
