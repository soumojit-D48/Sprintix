import { z } from 'zod'
import { router, protectedProcedure } from '../trpc'
import { prisma } from '@/lib/prisma'
import { TRPCError } from '@trpc/server'
import { triggerEvent } from '@/lib/pusher'
import { notifyMentioned, notifyCommented } from '@/lib/notifications'
import { sendMentionEmail } from '@/lib/email'
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

function extractTextPreview(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  const doc = json as { content?: { content?: { text?: string }[] }[] }
  if (!doc.content) return ''
  let text = ''
  for (const node of doc.content) {
    if (node.content) {
      for (const inline of node.content) {
        if (inline.text) text += inline.text
      }
    }
  }
  return text.trim().substring(0, 200)
}

export const commentRouter = router({
  create: protectedProcedure.input(createCommentSchema).mutation(async ({ ctx, input }) => {
    const issue = await prisma.issue.findUnique({
      where: { id: input.issueId },
      select: {
        id: true,
        identifier: true,
        title: true,
        assigneeId: true,
        reporterId: true,
        deletedAt: true,
        project: { select: { workspaceId: true } },
      },
    })
    if (!issue || issue.deletedAt) throw new TRPCError({ code: 'NOT_FOUND', message: 'Issue not found' })

    const member = await getMemberByClerkId(issue.project.workspaceId, ctx.userId!)
    if (!member) throw new TRPCError({ code: 'FORBIDDEN' })

    const user = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
      select: { id: true, name: true },
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

      return created
    })

    // Process notifications outside transaction
    const mentionedIds = extractMentionsFromTiptap(input.body)
    const filteredMentionedIds = mentionedIds.filter((id) => id !== user.id)

    if (filteredMentionedIds.length > 0) {
      await notifyMentioned(
        {
          id: comment.id,
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          type: 'comment',
        },
        filteredMentionedIds,
        user.name
      )

      // Send mention emails
      const mentionedUsers = await prisma.user.findMany({
        where: { id: { in: filteredMentionedIds } },
        select: { id: true, email: true },
      })
      const snippet = extractTextPreview(input.body)
      const conversationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/issues/${issue.id}`
      for (const mentionedUser of mentionedUsers) {
        await sendMentionEmail({
          email: mentionedUser.email,
          actorName: user.name,
          contextType: 'issue',
          contextName: issue.identifier,
          snippet,
          conversationUrl,
        })
      }
    }

    // Notify assignee and reporter of comment (excluding commenter and anyone already notified via mention)
    const mentionedSet = new Set(filteredMentionedIds)
    const recipients = new Set<string>()
    if (issue.assigneeId && issue.assigneeId !== user.id && !mentionedSet.has(issue.assigneeId)) {
      recipients.add(issue.assigneeId)
    }
    if (issue.reporterId && issue.reporterId !== user.id && !mentionedSet.has(issue.reporterId)) {
      recipients.add(issue.reporterId)
    }

    if (recipients.size > 0) {
      await notifyCommented(
        {
          id: comment.id,
          issueId: issue.id,
          issueIdentifier: issue.identifier,
          issueTitle: issue.title,
        },
        issue.assigneeId,
        issue.reporterId,
        user.id,
        user.name
      )
    }

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

    await prisma.reaction.deleteMany({
      where: { userId: user.id, commentId: input.commentId, emoji: { not: input.emoji } },
    })

    const reaction = await prisma.reaction.create({
      data: {
        emoji: input.emoji,
        userId: user.id,
        commentId: input.commentId,
      },
    })

    await triggerEvent(`private-workspace-${comment.issue.project.workspaceId}`, 'comment:reacted', {
      issueId: comment.issueId,
      commentId: input.commentId,
      emoji: input.emoji,
      userId: user.id,
    })

    return reaction
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

    await triggerEvent(`private-workspace-${comment.issue.project.workspaceId}`, 'comment:unreacted', {
      issueId: comment.issueId,
      commentId: input.commentId,
      emoji: input.emoji,
      userId: user.id,
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
          where: { issueId: input.issueId, deletedAt: null },
          include: {
            author: { select: { id: true, name: true, avatarUrl: true, email: true } },
            reactions: { select: { id: true, emoji: true, userId: true } },
          },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.activityLog.findMany({
          where: { entityId: input.issueId, entityType: 'issue', NOT: { action: 'commented' } },
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
