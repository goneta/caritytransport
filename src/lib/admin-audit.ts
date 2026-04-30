import { NextRequest } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

type Jsonish = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined

const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'authorization',
  'stripeCustomerId',
  'stripePaymentMethodId',
  'stripeSubscriptionId',
  'clientSecret',
])

function redactValue(value: Jsonish): Jsonish {
  if (Array.isArray(value)) return value.map(item => redactValue(item as Jsonish))
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (SENSITIVE_KEYS.has(key) || /password|token|secret|authorization|stripe/i.test(key)) {
        return [key, '[REDACTED]']
      }
      return [key, redactValue(nested as Jsonish)]
    })
  )
}

function toSnapshot(value: Jsonish): string | undefined {
  if (value === undefined) return undefined
  try {
    return JSON.stringify(redactValue(value), (_key, nested) => {
      if (nested instanceof Date) return nested.toISOString()
      return nested
    })
  } catch (_error) {
    return JSON.stringify({ note: 'Snapshot could not be serialised safely' })
  }
}

export function getAuditRequestMetadata(req?: NextRequest) {
  if (!req) return { ipAddress: undefined, userAgent: undefined }

  const forwardedFor = req.headers.get('x-forwarded-for')
  const ipAddress = forwardedFor?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || req.headers.get('cf-connecting-ip')
    || undefined

  return {
    ipAddress,
    userAgent: req.headers.get('user-agent') || undefined,
  }
}

export async function writeAdminAuditLog({
  userId,
  action,
  entity,
  entityId,
  before,
  after,
  request,
}: {
  userId?: string | null
  action: string
  entity: string
  entityId?: string | null
  before?: Jsonish
  after?: Jsonish
  request?: NextRequest
}) {
  try {
    const metadata = getAuditRequestMetadata(request)
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId: entityId || null,
        before: toSnapshot(before),
        after: toSnapshot(after),
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to write admin audit log', error)
  }
}

export async function writeAdminAuditLogForRequest({
  request,
  action,
  entity,
  entityId,
  before,
  after,
}: {
  request: NextRequest
  action: string
  entity: string
  entityId?: string | null
  before?: Jsonish
  after?: Jsonish
}) {
  const session = await auth()
  await writeAdminAuditLog({
    userId: session?.user?.id,
    action,
    entity,
    entityId,
    before,
    after,
    request,
  })
}
