import { prisma } from '@/lib/prisma'
import type { PrismaClient, Prisma } from '@prisma/client'

type TransactionClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$use' | '$extends'>

export async function createActivityLog(
  db: typeof prisma | TransactionClient,
  entityId: string,
  entityType: string,
  action: string,
  metadata: unknown,
  userId: string
) {
  return db.activityLog.create({
    data: { entityId, entityType, action, metadata: metadata as object, userId },
  })
}
