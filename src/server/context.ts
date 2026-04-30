import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { auth } from '@clerk/nextjs/server'

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  const { userId } = await auth()

  return {
    prisma,
    userId,
    workspaceId: null as string | null,
    memberRole: null as Role | null,
    ...opts,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
