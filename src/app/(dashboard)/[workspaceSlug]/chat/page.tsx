import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { ChatLayout } from '@/components/chat/ChatLayout'

export default async function ChatPage() {
  const { userId } = await auth()
  let currentUserId = ''
  if (userId) {
    const user = await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } })
    if (user) currentUserId = user.id
  }
  return <ChatLayout currentUserId={currentUserId} />
}
