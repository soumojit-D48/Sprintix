import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  reactSchema,
  unreactSchema,
  listCommentsSchema,
} from '@/lib/validations/comment'

async function getMemberByClerkId(workspaceId: string, clerkId: string) {
  return prisma.workspaceMember.findFirst({
    where: { workspaceId, user: { clerkId } },
  })
}

async function getIssueWorkspaceId(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { select: { workspaceId: true } } },
  })
  if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found' })
  return issue
}

async function getIssueWithProjectId(issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { project: { select: { workspaceId: true, id: true } } },
  })
  if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found' })
  return issue
}

import { createActivityLog } from '@/lib/activity-log'
import { extractMentionsFromTiptap } from '@/lib/mentions'

export const commentRouter = router({
  create: protectedProcedure.input(createCommentSchema).mutation(async ({ ctx, input }) => {
    const issue = await prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { workspaceId: true } } },
    })
    if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found' })

    const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const comment = await prisma.$transaction(async (tx) => {
      const created = await tx.comment.create({
        data: {
          body: input.body as object,
          issueId: input.issueId,
          authorId: user.id,
          parentId: input.parentId ?? null,
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true, email: true } },
          _count: { select: { replies: true } },
        },
      })

      await createActivityLog(
        tx,
        input.issueId,
        'issue',
        'commented',
        { commentId: created.id },
        user.id,
      )

      const mentionedIds = extractMentionsFromTiptap(input.body)
      if (mentionedIds.length > 0) {
        const notifications = mentionedIds
          .filter((id) => id !== user.id)
          .map((mentionedUserId) => ({
            userId: mentionedUserId,
            type: 'MENTIONED' as const,
            title: 'You were mentioned',
            body: `Mentioned in a comment on an issue`,
            entityId: created.id,
            entityType: 'comment',
          }))
        if (notifications.length > 0) {
          await tx.notification.createMany({ data: notifications })
        }
      }

      return created
    })

    await triggerEvent(`private-workspace-${issue.project.workspaceId}`, 'comment:created', {
      issueId: input.issueId,
      commentId: comment.id,
    })

    return comment
  }),

  update: protectedProcedure.input(updateCommentSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.comment.findUnique({
      where: { id: input.commentId },
      include: { issue: { include: { project: { select: { workspaceId: true } } } } },
    })
    if (!existing || existing.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user || existing.authorId !== user.id) throw new TRPCError({ code: 'FORBIDDEN' })

    return prisma.comment.update({
      where: { id: input.commentId },
      data: { body: input.body as object },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, email: true } },
        _count: { select: { replies: true } },
      },
    })
  }),

  delete: protectedProcedure.input(deleteCommentSchema).mutation(async ({ ctx, input }) => {
    const existing = await prisma.comment.findUnique({
      where: { id: input.commentId },
      include: { issue: { include: { project: { select: { workspaceId: true } } } } },
    })
    if (!existing) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user || existing.authorId !== user.id) throw new TRPCError({ code: 'FORBIDDEN' })

    await prisma.comment.update({
      where: { id: input.commentId },
      data: { deletedAt: new Date() },
    })

    await triggerEvent(`private-workspace-${existing.issue.project.workspaceId}`, 'comment:deleted', {
      issueId: existing.issueId,
      commentId: input.commentId,
    })

    return { success: true }
  }),

  list: protectedProcedure.input(listCommentsSchema).query(async ({ ctx, input }) => {
    const issue = await getIssueWorkspaceId(input.issueId)
    const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    return prisma.comment.findMany({
      where: { issueId: input.issueId, deletedAt: null, parentId: null },
      include: {
        author: { select: { id: true, name: true, avatarUrl: true, email: true } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true, email: true } },
            reactions: { select: { id: true, emoji: true, userId: true } },
          },
        },
        reactions: { select: { id: true, emoji: true, userId: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  }),

  react: protectedProcedure.input(reactSchema).mutation(async ({ ctx, input }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: input.commentId },
      include: { issue: { include: { project: { select: { workspaceId: true } } } } },
    })
    if (!comment || comment.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    const existing = await prisma.reaction.findUnique({
      where: {
        userId_commentId_emoji: {
          userId: user.id,
          commentId: input.commentId,
          emoji: input.emoji,
        },
      },
    })

    if (existing) return existing

    return prisma.reaction.create({
      data: {
        emoji: input.emoji,
        userId: user.id,
        commentId: input.commentId,
      },
    })
  }),

  unreact: protectedProcedure.input(unreactSchema).mutation(async ({ ctx, input }) => {
    const comment = await prisma.comment.findUnique({
      where: { id: input.commentId },
      include: { issue: { include: { project: { select: { workspaceId: true } } } } },
    })
    if (!comment || comment.deletedAt) throw new TRPCError({ code: 'NOT_FOUND' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true },
    })
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' })

    await prisma.reaction.deleteMany({
      where: {
        userId: user.id,
        commentId: input.commentId,
        emoji: input.emoji,
      },
    })

    return { success: true }
  }),

  getActivityFeed: protectedProcedure
    .input(z.object({ issueId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const issue = await getIssueWorkspaceId(input.issueId)
      const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
      if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

      const [comments, activityLogs] = await Promise.all([
        prisma.comment.findMany({
          where: { issueId: input.issueId, deletedAt: null, parentId: null },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true, email: true } },
            replies: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'asc' },
              include: {
                author: { select: { id: true, name: true, avatarUrl: true, email: true } },
                reactions: { select: { id: true, emoji: true, userId: true } },
              },
            },
            reactions: { select: { id: true, emoji: true, userId: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.activityLog.findMany({
          where: { entityId: input.issueId, entityType: 'issue' },
          include: {
            user: { select: { id: true, name: true, avatarUrl: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
      ])

      const unified = [
        ...comments.map((c) => ({ type: 'comment' as const, ...c })),
        ...activityLogs.map((l) => ({ type: 'activity' as const, ...l })),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

      return unified
    }),
})
