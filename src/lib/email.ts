import 'server-only'
import { resend } from '@/lib/resend'
import { render } from '@react-email/render'
import * as React from 'react'
import {
  InviteEmail,
  AssignedIssueEmail,
  MentionEmail,
  DailyDigestEmail,
  WeeklySummaryEmail,
} from '@/lib/email-registry'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
const FROM_NAME = process.env.RESEND_FROM_NAME || 'sprintix'

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
  try {
    const inviteUrl = `${getBaseUrl()}/invite/${params.token}`
    const html = await render(
      React.createElement(InviteEmail, {
        inviterName: params.inviterName,
        workspaceName: params.workspaceName,
        role: params.role,
        inviteUrl,
      })
    )

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `You've been invited to ${params.workspaceName}`,
      html,
    })
  } catch (error) {
    console.error('sendInviteEmail failed:', error)
  }
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
  try {
    console.log('[EMAIL] sendAssignedEmail: from=', FROM_EMAIL, 'to=', params.email)
    const issueUrl = `${getBaseUrl()}/${params.workspaceSlug}/issues/${params.issueId}`
    const html = await render(
      React.createElement(AssignedIssueEmail, {
        issueIdentifier: params.issueIdentifier,
        issueTitle: params.issueTitle,
        priority: params.priority,
        descriptionPreview: params.descriptionPreview,
        dueDate: params.dueDate,
        assigneeName: params.assigneeName,
        projectName: params.projectName,
        issueUrl,
      })
    )

    const result = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `${params.issueIdentifier} — ${params.issueTitle}`,
      html,
    })
    console.log('[EMAIL] sendAssignedEmail result:', JSON.stringify(result))
  } catch (error) {
    console.error('sendAssignedEmail failed:', error)
  }
}

export async function sendMentionEmail(params: {
  email: string
  actorName: string
  contextType: 'issue' | 'channel'
  contextName: string
  snippet: string
  conversationUrl: string
}) {
  try {
    const html = await render(
      React.createElement(MentionEmail, {
        actorName: params.actorName,
        contextType: params.contextType,
        contextName: params.contextName,
        snippet: params.snippet,
        conversationUrl: params.conversationUrl,
      })
    )

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `${params.actorName} mentioned you in ${
        params.contextType === 'issue'
          ? params.contextName
          : `#${params.contextName}`
      }`,
      html,
    })
  } catch (error) {
    console.error('sendMentionEmail failed:', error)
  }
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
  try {
    const dashboardUrl = `${getBaseUrl()}/${params.workspaceSlug}`
    const html = await render(
      React.createElement(DailyDigestEmail, {
        userName: params.userName,
        workspaceName: params.workspaceName,
        items: params.items,
        dashboardUrl,
      })
    )

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `Daily digest — ${params.workspaceName}`,
      html,
    })
  } catch (error) {
    console.error('sendDailyDigest failed:', error)
  }
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
  try {
    const dashboardUrl = `${getBaseUrl()}/${params.workspaceSlug}`
    const html = await render(
      React.createElement(WeeklySummaryEmail, {
        userName: params.userName,
        workspaceName: params.workspaceName,
        sprintProgress: params.sprintProgress,
        issuesCompletedThisWeek: params.issuesCompletedThisWeek,
        weeklyGoal: params.weeklyGoal,
        upcomingDueDates: params.upcomingDueDates,
        mostActiveMember: params.mostActiveMember,
        dashboardUrl,
      })
    )

    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `Weekly summary — ${params.workspaceName}`,
      html,
    })
  } catch (error) {
    console.error('sendWeeklySummary failed:', error)
  }
}
