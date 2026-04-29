import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { ZodError } from 'zod'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    }
  },
})

//  Base router and procedure
export const router = t.router
export const createCallerFactory = t.createCallerFactory

//  Public procedure — no auth required
export const publicProcedure = t.procedure

//  Protected procedure — must be logged in
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  })
})

// Role hierarchy helper
const roleHierarchy: Record<string, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
}

function hasMinimumRole(userRole: string | null, minimumRole: string): boolean {
  if (!userRole) return false
  return (roleHierarchy[userRole] ?? -1) >= (roleHierarchy[minimumRole] ?? 99)
}

// Admin procedure — must be ADMIN or OWNER
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!hasMinimumRole(ctx.memberRole, 'ADMIN')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must be an admin to perform this action.',
    })
  }
  return next({ ctx })
})

// Owner procedure — must be OWNER only
export const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!hasMinimumRole(ctx.memberRole, 'OWNER')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the workspace owner can perform this action.',
    })
  }
  return next({ ctx })
})

// Pro procedure — must be on Pro plan
export const proProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.workspaceId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No workspace context found.',
    })
  }

  const workspace = await ctx.prisma.workspace.findUnique({
    where: { id: ctx.workspaceId },
    select: { plan: true },
  })

  if (workspace?.plan !== 'PRO') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'UPGRADE_REQUIRED',
    })
  }

  return next({ ctx })
})
