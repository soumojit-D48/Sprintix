import { z } from 'zod'

export const createCommentSchema = z.object({
  issueId: z.string().min(1),
  body: z.record(z.string(), z.any()),
  parentId: z.string().nullable().optional(),
})

export const updateCommentSchema = z.object({
  commentId: z.string().min(1),
  body: z.record(z.string(), z.any()),
})

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
})

export const reactSchema = z.object({
  commentId: z.string().min(1),
  emoji: z.string().min(1),
})

export const unreactSchema = z.object({
  commentId: z.string().min(1),
  emoji: z.string().min(1),
})

export const listCommentsSchema = z.object({
  issueId: z.string().min(1),
})
