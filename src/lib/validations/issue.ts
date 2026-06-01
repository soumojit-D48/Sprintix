import { z } from 'zod'

export const createIssueSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(255),
  description: z.any().optional(),
  status: z
    .enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'])
    .default('TODO'),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).default('MEDIUM'),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
  sprintId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
})

export const updateIssueSchema = z.object({
  issueId: z.string().min(1),
  title: z.string().min(1).max(255).optional(),
  description: z.any().optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  sprintId: z.string().nullable().optional(),
})

export const updateStatusSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
})

export const updatePrioritySchema = z.object({
  issueId: z.string().min(1),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']),
})

export const assignIssueSchema = z.object({
  issueId: z.string().min(1),
  assigneeId: z.string().nullable(),
})

export const reorderIssueSchema = z.object({
  issueId: z.string().min(1),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']),
  order: z.number(),
})

export const bulkUpdateSchema = z.object({
  issueIds: z.array(z.string()).min(1),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).optional(),
  assigneeId: z.string().nullable().optional(),
  sprintId: z.string().nullable().optional(),
})

export const listIssuesSchema = z.object({
  projectId: z.string(),
  status: z
    .array(z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']))
    .optional(),
  priority: z.array(z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY'])).optional(),
  assigneeId: z.string().optional(),
  labelId: z.string().optional(),
  sprintId: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['priority', 'dueDate', 'createdAt', 'updatedAt', 'order']).default('order'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().min(1).max(200).default(100),
  offset: z.number().min(0).default(0),
})

export const createLabelSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(50),
  color: z.string().default('#6366F1'),
})

export const addAttachmentSchema = z.object({
  issueId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  size: z.number().int().positive(),
  mimeType: z.string().min(1),
})

export const removeAttachmentSchema = z.object({
  attachmentId: z.string().min(1),
})
