import { router } from '../trpc'
import { workspaceRouter } from './workspace'
import { projectRouter } from './project'
import { issueRouter } from './issue'
import { commentRouter } from './comment'
import { sprintRouter } from './sprint'
import { memberRouter } from './member'
import { notificationRouter } from './notification'
import { channelRouter } from './channel'
import { messageRouter } from './message'
import { billingRouter } from './billing'
import { aiRouter } from './ai'
import { analyticsRouter } from './analytics'
import { labelRouter } from './label'

export const appRouter = router({
  workspace: workspaceRouter,
  project: projectRouter,
  issue: issueRouter,
  comment: commentRouter,
  sprint: sprintRouter,
  member: memberRouter,
  notification: notificationRouter,
  channel: channelRouter,
  message: messageRouter,
  billing: billingRouter,
  ai: aiRouter,
  analytics: analyticsRouter,
  label: labelRouter,
})

export type AppRouter = typeof appRouter
