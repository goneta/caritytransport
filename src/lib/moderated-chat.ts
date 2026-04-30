import prisma from '@/lib/prisma'

const BLOCKED_TERMS = [
  'fuck',
  'shit',
  'bastard',
  'idiot',
  'stupid',
  'kill yourself',
]

const SENSITIVE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b\d{12,19}\b/g, reason: 'Possible card or long identity number' },
  { pattern: /\b\d{2}\s?\d{2}\s?\d{2}\b/g, reason: 'Possible bank sort code' },
]

export type ModerationDecision = {
  status: 'VISIBLE' | 'FLAGGED' | 'BLOCKED'
  sanitizedContent: string
  reason?: string
}

export function normalizeChatContent(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, 2000)
}

export function moderateChatMessage(rawContent: string): ModerationDecision {
  const content = normalizeChatContent(rawContent)
  const lowered = content.toLowerCase()
  const blockedTerm = BLOCKED_TERMS.find((term) => lowered.includes(term))

  if (blockedTerm) {
    return {
      status: 'BLOCKED',
      sanitizedContent: '[Message held for moderation]',
      reason: 'Message contains abusive or unsafe language',
    }
  }

  const sensitiveMatch = SENSITIVE_PATTERNS.find(({ pattern }) => pattern.test(content))
  if (sensitiveMatch) {
    return {
      status: 'FLAGGED',
      sanitizedContent: content,
      reason: sensitiveMatch.reason,
    }
  }

  return { status: 'VISIBLE', sanitizedContent: content }
}

export function isAdminRole(role?: string | null): boolean {
  return ['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'].includes(role || '')
}

export async function userCanAccessThread(threadId: string, userId: string, role?: string | null): Promise<boolean> {
  if (isAdminRole(role)) return true

  const participant = await prisma.chatParticipant.findUnique({
    where: { threadId_userId: { threadId, userId } },
    select: { userId: true },
  })

  return Boolean(participant)
}

export async function createModerationLog(params: {
  threadId: string
  messageId?: string | null
  actorId?: string | null
  action: string
  reason?: string | null
  originalContent?: string | null
}) {
  await prisma.chatModerationLog.create({
    data: {
      threadId: params.threadId,
      messageId: params.messageId || null,
      actorId: params.actorId || null,
      action: params.action,
      reason: params.reason || null,
      originalContent: params.originalContent || null,
    },
  })
}

async function driverIsLikelyDriving(userId: string): Promise<boolean> {
  const driver = await prisma.driver.findUnique({ where: { userId }, select: { id: true } })
  if (!driver) return false

  const activeLog = await prisma.tripLog.findFirst({
    where: {
      driverId: driver.id,
      status: { in: ['EN_ROUTE', 'BOARDED', 'ARRIVED'] },
      timestamp: { gte: new Date(Date.now() - 6 * 60 * 60 * 1000) },
    },
    orderBy: { timestamp: 'desc' },
    select: { id: true },
  })

  return Boolean(activeLog)
}

export async function createDriverAutoReplies(threadId: string, senderId: string): Promise<number> {
  const driverParticipants = await prisma.chatParticipant.findMany({
    where: {
      threadId,
      userId: { not: senderId },
      user: { role: 'DRIVER' },
    },
    select: { userId: true },
  })

  let created = 0
  for (const participant of driverParticipants) {
    const likelyDriving = await driverIsLikelyDriving(participant.userId)
    if (!likelyDriving) continue

    const recentAutoReply = await prisma.directMessage.findFirst({
      where: {
        threadId,
        senderId: participant.userId,
        driverAutoReply: true,
        createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
      },
      select: { id: true },
    })
    if (recentAutoReply) continue

    await prisma.directMessage.create({
      data: {
        threadId,
        senderId: participant.userId,
        content: 'I am currently driving or supervising a route. I will reply when it is safe to do so. For urgent safety issues, please contact the operations team immediately.',
        sanitizedContent: 'I am currently driving or supervising a route. I will reply when it is safe to do so. For urgent safety issues, please contact the operations team immediately.',
        status: 'AUTO_REPLY',
        driverAutoReply: true,
      },
    })
    created += 1
  }

  return created
}
