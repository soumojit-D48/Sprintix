import 'server-only'
import { resend } from '@/lib/resend'
import * as React from 'react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@sprintix.app'

function getBaseUrl(): string {
  return APP_URL
}

export async function sendInviteEmail(params: {
  email: string
  inviterName: string
  workspaceName: string
  workspaceSlug: string
  role: string
  token: string
}) {
  const InviteEmail = (await import('@/../emails/InviteEmail')).default

  const inviteUrl = `${getBaseUrl()}/invite/${params.token}`

  return resend.emails.send({
    from: `sprintix <${FROM_EMAIL}>`,
    to: params.email,
    subject: `You've been invited to ${params.workspaceName}`,
    react: React.createElement(InviteEmail, {
      inviterName: params.inviterName,
      workspaceName: params.workspaceName,
      role: params.role,
      inviteUrl,
    }),
  })
}

export async function sendAssignedEmail(params: {
  email: string
  issueIdentifier: string
  issueTitle: string
  priority: string
  descriptionPreview: string | null
  dueDate: string | null
  assigneeName: string
  projectName: string
  workspaceSlug: string
  issueId: string
}) {
  const AssignedIssueEmail = (await import('@/../emails/AssignedIssueEmail')).default

  const issueUrl = `${getBaseUrl()}/${params.workspaceSlug}/issues/${params.issueId}`

  return resend.emails.send({
    from: `sprintix <${FROM_EMAIL}>`,
    to: params.email,
    subject: `${params.issueIdentifier} — ${params.issueTitle}`,
    react: React.createElement(AssignedIssueEmail, {
      issueIdentifier: params.issueIdentifier,
      issueTitle: params.issueTitle,
      priority: params.priority,
      descriptionPreview: params.descriptionPreview,
      dueDate: params.dueDate,
      assigneeName: params.assigneeName,
      projectName: params.projectName,
      issueUrl,
    }),
  })
}

export async function sendMentionEmail(params: {
  email: string
  actorName: string
  contextType: 'issue' | 'channel'
  contextName: string
  snippet: string
  conversationUrl: string
}) {
  const MentionEmail = (await import('@/../emails/MentionEmail')).default

  return resend.emails.send({
    from: `sprintix <${FROM_EMAIL}>`,
    to: params.email,
    subject: `${params.actorName} mentioned you in ${params.contextType === 'issue' ? params.contextName : `#${params.contextName}`}`,
    react: React.createElement(MentionEmail, {
      actorName: params.actorName,
      contextType: params.contextType,
      contextName: params.contextName,
      snippet: params.snippet,
      conversationUrl: params.conversationUrl,
    }),
  })
}

export async function sendDailyDigest(params: {
  email: string
  userName: string
  workspaceName: string
  workspaceSlug: string
  items: {
    projectName: string
    items: {
      type: 'status_change' | 'new_comment' | 'new_assignment'
      issueIdentifier: string
      issueTitle: string
      summary: string
    }[]
  }[]
}) {
  const DailyDigestEmail = (await import('@/../emails/DailyDigestEmail')).default

  const dashboardUrl = `${getBaseUrl()}/${params.workspaceSlug}`

  return resend.emails.send({
    from: `sprintix <${FROM_EMAIL}>`,
    to: params.email,
    subject: `Daily digest — ${params.workspaceName}`,
    react: React.createElement(DailyDigestEmail, {
      userName: params.userName,
      workspaceName: params.workspaceName,
      items: params.items,
      dashboardUrl,
    }),
  })
}

export async function sendWeeklySummary(params: {
  email: string
  userName: string
  workspaceName: string
  workspaceSlug: string
  sprintProgress: {
    name: string
    percentComplete: number
    completedIssues: number
    totalIssues: number
  } | null
  issuesCompletedThisWeek: number
  weeklyGoal: number
  upcomingDueDates: {
    issueIdentifier: string
    issueTitle: string
    dueDate: string
    projectName: string
  }[]
  mostActiveMember: string
}) {
  const WeeklySummaryEmail = (await import('@/../emails/WeeklySummaryEmail')).default

  const dashboardUrl = `${getBaseUrl()}/${params.workspaceSlug}`

  return resend.emails.send({
    from: `sprintix <${FROM_EMAIL}>`,
    to: params.email,
    subject: `Weekly summary — ${params.workspaceName}`,
    react: React.createElement(WeeklySummaryEmail, {
      userName: params.userName,
      workspaceName: params.workspaceName,
      sprintProgress: params.sprintProgress,
      issuesCompletedThisWeek: params.issuesCompletedThisWeek,
      weeklyGoal: params.weeklyGoal,
      upcomingDueDates: params.upcomingDueDates,
      mostActiveMember: params.mostActiveMember,
      dashboardUrl,
    }),
  })
}
