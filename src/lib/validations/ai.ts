import { z } from 'zod'

export const summarizeIssueSchema = z.object({
  issueId: z.string().min(1),
})

export const suggestAssigneeSchema = z.object({
  projectId: z.string().min(1),
  issueTitle: z.string().min(1).max(255),
  issueDescription: z.any().optional(),
})

export const suggestLabelsSchema = z.object({
  workspaceId: z.string().min(1),
  issueTitle: z.string().min(1).max(255),
  issueDescription: z.any().optional(),
})

export const planSprintSchema = z.object({
  projectId: z.string().min(1),
})
