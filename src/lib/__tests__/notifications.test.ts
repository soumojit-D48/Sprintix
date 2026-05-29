import { describe, it, expect, mock, spyOn } from 'bun:test'
import {
  createNotification,
  notifyAssigned,
  notifyMentioned,
  notifyCommented,
  notifyInvited,
  notifyMessageReceived,
} from '../notifications'
import { prisma } from '@/lib/prisma'
import { triggerEvent } from '@/lib/pusher'
import { NotificationType } from '@prisma/client'

// Mock Pusher triggerEvent
mock.module('@/lib/pusher', () => ({
  triggerEvent: mock(() => Promise.resolve()),
}))

describe('Notifications Helper System', () => {
  it('should be able to create an in-app notification', async () => {
    // 1. Arrange: Resolve a test user from the DB
    const testUser = await prisma.user.findFirst({
      select: { id: true, name: true },
    })

    if (!testUser) {
      console.warn('Skipping test: No test user found in DB.')
      return
    }

    // 2. Act: Create a notification
    const notification = await createNotification({
      userId: testUser.id,
      type: NotificationType.ASSIGNED,
      title: 'Test Notification',
      body: 'This is a test notification body',
      entityId: 'test-entity-id',
      entityType: 'issue',
    })

    // 3. Assert
    expect(notification).toBeDefined()
    expect(notification.userId).toBe(testUser.id)
    expect(notification.type).toBe(NotificationType.ASSIGNED)
    expect(notification.title).toBe('Test Notification')
    expect(notification.body).toBe('This is a test notification body')
    expect(notification.read).toBe(false)
    expect(notification.entityId).toBe('test-entity-id')
    expect(notification.entityType).toBe('issue')

    // Clean up
    await prisma.notification.delete({
      where: { id: notification.id },
    })
  })

  it('should format assigned notifications correctly', async () => {
    const testUser = await prisma.user.findFirst({
      select: { id: true },
    })

    if (!testUser) return

    const notification = await notifyAssigned(
      { id: 'issue-123', identifier: 'ENG-42', title: 'Fix auth' },
      testUser.id,
      'Sarah Connor'
    )

    expect(notification.title).toBe('Assigned to ENG-42')
    expect(notification.body).toBe('Sarah Connor assigned you to Fix auth')
    expect(notification.entityId).toBe('issue-123')
    expect(notification.entityType).toBe('issue')

    // Clean up
    await prisma.notification.delete({
      where: { id: notification.id },
    })
  })

  it('should format comment notifications correctly', async () => {
    const testUser = await prisma.user.findFirst({
      select: { id: true },
    })

    if (!testUser) return

    const notifications = await notifyCommented(
      {
        id: 'comment-123',
        issueId: 'issue-123',
        issueIdentifier: 'ENG-42',
        issueTitle: 'Fix auth',
      },
      null, // assigneeId
      testUser.id, // reporterId (recipient)
      'actor-123', // actorId
      'Sarah Connor'
    )

    expect(notifications.length).toBeGreaterThan(0)
    const notification = notifications[0]
    expect(notification?.title).toBe('New comment on ENG-42')
    expect(notification?.body).toBe('Sarah Connor commented on Fix auth')
    expect(notification?.entityId).toBe('issue-123')
    expect(notification?.entityType).toBe('issue')

    // Clean up
    await prisma.notification.deleteMany({
      where: { id: { in: notifications.map((n) => n.id) } },
    })
  })
})
