import { z } from 'zod'

export const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  body: z.record(z.string(), z.any()),
  parentId: z.string().nullable().optional(),
})

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  body: z.record(z.string(), z.any()),
})

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
})

export const listMessagesSchema = z.object({
  channelId: z.string().min(1),
  cursor: z.string().nullable().optional(),
  limit: z.number().min(1).max(100).default(50),
})

export const reactToMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1),
})

export const unreactToMessageSchema = z.object({
  messageId: z.string().min(1),
  emoji: z.string().min(1),
})

export const searchMessagesSchema = z.object({
  workspaceId: z.string().min(1),
  query: z.string().min(1).max(200),
  limit: z.number().min(1).max(50).default(20),
})

export const getThreadSchema = z.object({
  messageId: z.string().min(1),
})
