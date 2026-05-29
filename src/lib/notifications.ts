import { prisma } from '@/lib/prisma'
import { triggerEvent } from '@/lib/pusher'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  entityId?: string | null
  entityType?: string | null
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? null,
      },
    })

    // Trigger Pusher real-time event for the user
    await triggerEvent(`private-user-${params.userId}`, 'notification:created', {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      read: notification.read,
      entityId: notification.entityId,
      entityType: notification.entityType,
      createdAt: notification.createdAt.toISOString(),
    })

    return notification
  } catch (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

export async function notifyAssigned(
  issue: { id: string; identifier: string; title: string },
  assigneeId: string,
  actorName: string
) {
  return createNotification({
    userId: assigneeId,
    type: NotificationType.ASSIGNED,
    title: `Assigned to ${issue.identifier}`,
    body: `${actorName} assigned you to ${issue.title}`,
    entityId: issue.id,
    entityType: 'issue',
  })
}

export async function notifyMentioned(
  entity: { id: string; issueId?: string; issueIdentifier?: string; type: 'comment' | 'message' },
  mentionedUserIds: string[],
  actorName: string
) {
  const promises = mentionedUserIds.map((userId) => {
    const title =
      entity.type === 'comment'
        ? `Mentioned in ${entity.issueIdentifier || 'comment'}`
        : 'Mentioned in chat'
    const body =
      entity.type === 'comment'
        ? `${actorName} mentioned you in a comment`
        : `${actorName} mentioned you in a message`

    return createNotification({
      userId,
      type: NotificationType.MENTIONED,
      title,
      body,
      entityId: entity.type === 'comment' ? (entity.issueId || entity.id) : entity.id,
      entityType: entity.type === 'comment' ? 'issue' : entity.type,
    })
  })

  return Promise.all(promises)
}

export async function notifyCommented(
  comment: { id: string; issueId: string; issueIdentifier: string; issueTitle: string },
  issueAssigneeId: string | null,
  issueReporterId: string,
  actorId: string,
  actorName: string
) {
  const recipients = new Set<string>()
  if (issueAssigneeId && issueAssigneeId !== actorId) recipients.add(issueAssigneeId)
  if (issueReporterId && issueReporterId !== actorId) recipients.add(issueReporterId)

  const promises = Array.from(recipients).map((userId) => {
    return createNotification({
      userId,
      type: NotificationType.COMMENTED,
      title: `New comment on ${comment.issueIdentifier}`,
      body: `${actorName} commented on ${comment.issueTitle}`,
      entityId: comment.issueId,
      entityType: 'issue',
    })
  })

  return Promise.all(promises)
}

export async function notifyInvited(
  invite: { id: string; email: string; workspaceName: string },
  inviterName: string
) {
  const user = await prisma.user.findUnique({
    where: { email: invite.email },
    select: { id: true },
  })

  if (!user) return null

  return createNotification({
    userId: user.id,
    type: NotificationType.INVITED,
    title: `Invited to ${invite.workspaceName}`,
    body: `${inviterName} invited you to join their workspace`,
    entityId: invite.id,
    entityType: 'invite',
  })
}

export async function notifyMessageReceived(
  message: { id: string; senderId: string; body: string },
  recipientId: string,
  actorName: string
) {
  return createNotification({
    userId: recipientId,
    type: NotificationType.MESSAGE_RECEIVED,
    title: `New message from ${actorName}`,
    body: message.body,
    entityId: message.id,
    entityType: 'message',
  })
}
