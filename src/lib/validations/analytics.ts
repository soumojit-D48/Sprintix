import { z } from 'zod'

export const workspaceAnalyticsSchema = z.object({
  workspaceSlug: z.string().min(1),
})

export const teamWorkloadSchema = z.object({
  workspaceId: z.string().min(1),
})

export const projectAnalyticsSchema = z.object({
  projectId: z.string().min(1),
})

export const burndownSchema = z.object({
  sprintId: z.string().min(1),
})

export const velocitySchema = z.object({
  projectId: z.string().min(1),
  sprintCount: z.number().int().positive().default(6),
})

export const overdueIssuesSchema = z.object({
  workspaceId: z.string().min(1),
  limit: z.number().int().positive().default(20),
})
