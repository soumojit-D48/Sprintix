import { prisma } from '@/lib/prisma'
import type { Role } from '@prisma/client'
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'

export async function createTRPCContext(opts: FetchCreateContextFnOptions) {
  return {
    prisma,
    userId: null as string | null,
    workspaceId: null as string | null,
    memberRole: null as Role | null,
    ...opts,
  }
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>
