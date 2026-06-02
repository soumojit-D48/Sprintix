import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { notifyInvited } from '@/lib/notifications'
import { sendInviteEmail } from '@/lib/email'

export const memberRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId: input.workspaceId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
      })

      return members
    }),

  getPendingInvites: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Check if user has permission (admin or owner)
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to view invites.',
        })
      }

      const invites = await prisma.invite.findMany({
        where: {
          workspaceId: input.workspaceId,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: {
          expiresAt: 'asc',
        },
      })

      return invites
    }),

  invite: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        emails: z.array(z.string().email()),
        role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']).default('MEMBER'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or owner
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to invite members.',
        })
      }

      // ADMIN can only invite MEMBER or VIEWER, not ADMIN
      if (membership.role === 'ADMIN' && input.role === 'ADMIN') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Admin cannot invite other admins. Only owners can do that.',
        })
      }

      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const invites = await Promise.all(
        input.emails.map((email) =>
          prisma.invite.create({
            data: {
              email,
              workspaceId: input.workspaceId,
              role: input.role,
              expiresAt,
            },
          })
        )
      )

      // Send notifications for users who already have accounts
      const workspace = await prisma.workspace.findUnique({
        where: { id: input.workspaceId },
        select: { name: true, slug: true },
      })

      const inviter = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { name: true },
      })

      for (const invite of invites) {
        await notifyInvited(
          { id: invite.id, email: invite.email, workspaceName: workspace?.name || 'Workspace' },
          inviter?.name || 'Someone'
        )

        await sendInviteEmail({
          email: invite.email,
          inviterName: inviter?.name || 'Someone',
          workspaceName: workspace?.name || 'Workspace',
          workspaceSlug: workspace?.slug || 'workspace',
          role: invite.role,
          token: invite.token,
        })
      }

      return invites
    }),

  resendInvite: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.invite.findUnique({
        where: { id: input.inviteId },
        include: { workspace: true },
      })

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found.',
        })
      }

      // Check if user has permission
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to resend invites.',
        })
      }

      // Extend expiry by 7 days
      const newExpiresAt = new Date()
      newExpiresAt.setDate(newExpiresAt.getDate() + 7)

      const updated = await prisma.invite.update({
        where: { id: input.inviteId },
        data: { expiresAt: newExpiresAt },
      })

      const inviter = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
        select: { name: true },
      })

      await sendInviteEmail({
        email: invite.email,
        inviterName: inviter?.name || 'Someone',
        workspaceName: invite.workspace.name,
        workspaceSlug: invite.workspace.slug,
        role: invite.role,
        token: invite.token,
      })

      return updated
    }),

  cancelInvite: protectedProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.invite.findUnique({
        where: { id: input.inviteId },
      })

      if (!invite) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Invite not found.',
        })
      }

      // Check if user has permission
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to cancel invites.',
        })
      }

      await prisma.invite.delete({
        where: { id: input.inviteId },
      })

      return { success: true }
    }),

  remove: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or owner
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to remove members.',
        })
      }

      // Get the member to be removed
      const memberToRemove = await prisma.workspaceMember.findUnique({
        where: { id: input.memberId },
      })

      if (!memberToRemove) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found.',
        })
      }

      // Cannot remove owner
      if (memberToRemove.role === 'OWNER') {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot remove the workspace owner.',
        })
      }

      // Cannot remove yourself
      if (memberToRemove.userId === ctx.userId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'You cannot remove yourself. Transfer ownership first.',
        })
      }

      await prisma.workspaceMember.delete({
        where: { id: input.memberId },
      })

      return { success: true }
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        memberId: z.string(),
        role: z.enum(['VIEWER', 'MEMBER', 'ADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin or owner
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: { in: ['OWNER', 'ADMIN'] },
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You do not have permission to change roles.',
        })
      }

      // ADMIN cannot change owner or other ADMIN roles
      if (membership.role === 'ADMIN') {
        const targetMember = await prisma.workspaceMember.findUnique({
          where: { id: input.memberId },
        })

        if (!targetMember) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Member not found.',
          })
        }

        if (targetMember.role === 'OWNER' || targetMember.role === 'ADMIN') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Admin cannot change owner or admin roles.',
          })
        }
      }

      const updated = await prisma.workspaceMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
      })

      return updated
    }),

  transferOwnership: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string(),
        newOwnerId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only owner can transfer ownership
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
          role: 'OWNER',
        },
      })

      if (!membership) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Only the workspace owner can transfer ownership.',
        })
      }

      // Find the new owner
      const newOwnerMember = await prisma.workspaceMember.findUnique({
        where: { id: input.newOwnerId },
      })

      if (!newOwnerMember) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Member not found.',
        })
      }

      // Transaction: demote current owner to admin, promote new owner to owner
      await prisma.$transaction([
        prisma.workspaceMember.update({
          where: { id: membership.id },
          data: { role: 'ADMIN' },
        }),
        prisma.workspaceMember.update({
          where: { id: input.newOwnerId },
          data: { role: 'OWNER' },
        }),
      ])

      return { success: true }
    }),

  getCurrentMember: protectedProcedure
    .input(z.object({ workspaceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: input.workspaceId,
          user: { clerkId: ctx.userId },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      })

      return member
    }),
})
