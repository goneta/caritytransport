import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSecurityPolicy, isAdminLikeRole } from '@/lib/two-factor'

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const role = (session.user as { role?: string }).role
  if (!isAdminLikeRole(role)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { session, userId: session.user.id }
}

export async function GET() {
  try {
    const gate = await requireAdmin()
    if ('error' in gate) return gate.error
    const policy = await getSecurityPolicy()
    return NextResponse.json(policy)
  } catch (error) {
    console.error('Security policy load error:', error)
    return NextResponse.json({ error: 'Failed to load security policy' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const gate = await requireAdmin()
    if ('error' in gate) return gate.error

    const body = await req.json()
    const before = await getSecurityPolicy()
    const data = {
      requireAdminTwoFactor: Boolean(body.requireAdminTwoFactor),
      requireDriverTwoFactor: Boolean(body.requireDriverTwoFactor),
      updatedById: gate.userId,
    }

    const policy = await prisma.securityPolicy.upsert({
      where: { id: 'global' },
      update: data,
      create: { id: 'global', ...data },
    })

    await prisma.auditLog.create({
      data: {
        userId: gate.userId,
        action: 'SECURITY_POLICY_UPDATED',
        entity: 'SecurityPolicy',
        entityId: 'global',
        before: JSON.stringify({ requireAdminTwoFactor: before.requireAdminTwoFactor, requireDriverTwoFactor: before.requireDriverTwoFactor }),
        after: JSON.stringify({ requireAdminTwoFactor: policy.requireAdminTwoFactor, requireDriverTwoFactor: policy.requireDriverTwoFactor }),
      },
    })

    return NextResponse.json(policy)
  } catch (error) {
    console.error('Security policy update error:', error)
    return NextResponse.json({ error: 'Failed to update security policy' }, { status: 500 })
  }
}
