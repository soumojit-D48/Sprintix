import { z } from 'zod'

export const createChannelSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'PRIVATE']).default('PUBLIC'),
  memberIds: z.array(z.string()).optional(),
})

export const updateChannelSchema = z.object({
  channelId: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
})

export const listChannelsSchema = z.object({
  workspaceId: z.string().min(1),
})

export const getChannelSchema = z.object({
  channelId: z.string().min(1),
})

export const archiveChannelSchema = z.object({
  channelId: z.string().min(1),
})

export const addChannelMemberSchema = z.object({
  channelId: z.string().min(1),
  userId: z.string().min(1),
})

export const removeChannelMemberSchema = z.object({
  channelId: z.string().min(1),
  userId: z.string().min(1),
})

export const getChannelMembersSchema = z.object({
  channelId: z.string().min(1),
})

export const createDmSchema = z.object({
  workspaceId: z.string().min(1),
  participantId: z.string().min(1),
})

export const listDmsSchema = z.object({
  workspaceId: z.string().min(1),
})
