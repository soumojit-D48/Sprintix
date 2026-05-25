import { z } from 'zod'

export const createSprintSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(200),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
})

export const updateSprintSchema = z.object({
  sprintId: z.string(),
  name: z.string().min(1).max(200).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

export const startSprintSchema = z.object({
  sprintId: z.string(),
})

export const closeSprintSchema = z.object({
  sprintId: z.string(),
  incompleteDisposition: z.enum(['BACKLOG', 'NEW_SPRINT']).default('BACKLOG'),
  newSprintId: z.string().optional(),
})

export const deleteSprintSchema = z.object({
  sprintId: z.string(),
})

export const addIssueToSprintSchema = z.object({
  sprintId: z.string(),
  issueIds: z.array(z.string()).min(1),
})

export const removeIssueFromSprintSchema = z.object({
  sprintId: z.string(),
  issueIds: z.array(z.string()).min(1),
})

export const listSprintsSchema = z.object({
  projectId: z.string(),
})

export const getSprintByIdSchema = z.object({
  sprintId: z.string(),
})

export const getSprintStatsSchema = z.object({
  sprintId: z.string(),
})

export const listWorkspaceSprintsSchema = z.object({
  workspaceId: z.string(),
})
