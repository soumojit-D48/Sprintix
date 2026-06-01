import { z } from 'zod'

function isTiptapEmpty(body: Record<string, unknown>): boolean {
  const content = (body as any)?.content
  if (!content || !Array.isArray(content) || content.length === 0) return true
  if (content.length === 1 && content[0]?.type === 'paragraph' && (!content[0]?.content || content[0].content.length === 0)) return true
  return false
}

export const messageAttachmentSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().int().positive(),
  mimeType: z.string().min(1),
})

export const sendMessageSchema = z.object({
  channelId: z.string().min(1),
  body: z.record(z.string(), z.any()).refine((val) => !isTiptapEmpty(val), {
    message: 'Message body cannot be empty',
  }),
  parentId: z.string().nullable().optional(),
  attachments: z.array(messageAttachmentSchema).optional(),
})

export const editMessageSchema = z.object({
  messageId: z.string().min(1),
  body: z.record(z.string(), z.any()).refine((val) => !isTiptapEmpty(val), {
    message: 'Message body cannot be empty',
  }),
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
