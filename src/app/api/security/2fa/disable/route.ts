import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { verifySecondFactorForLogin } from '@/lib/two-factor'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Authenticator or recovery code is required' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, twoFactorEnabled: true, twoFactorSecret: true, twoFactorRecoveryCodes: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!user.twoFactorEnabled) return NextResponse.json({ error: 'Two-factor authentication is not enabled' }, { status: 400 })

    const valid = await verifySecondFactorForLogin(user, code)
    if (!valid) return NextResponse.json({ error: 'Invalid authenticator or recovery code' }, { status: 400 })

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorPendingSecret: null,
        twoFactorRecoveryCodes: null,
        twoFactorEnrolledAt: null,
        twoFactorLastUsedAt: null,
      },
    })

    await prisma.auditLog.create({ data: { userId: user.id, action: '2FA_DISABLED', entity: 'User', entityId: user.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Failed to disable two-factor authentication' }, { status: 500 })
  }
}
