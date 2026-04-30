import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateRecoveryCodes, hashRecoveryCodes, isTwoFactorEligibleRole, verifyTotpToken } from '@/lib/two-factor'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code } = await req.json()
    if (!code || typeof code !== 'string') return NextResponse.json({ error: 'Authenticator code is required' }, { status: 400 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, twoFactorEnabled: true, twoFactorPendingSecret: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!isTwoFactorEligibleRole(user.role)) return NextResponse.json({ error: 'Two-factor authentication is currently available for admin and driver accounts only' }, { status: 403 })
    if (user.twoFactorEnabled) return NextResponse.json({ error: 'Two-factor authentication is already enabled' }, { status: 400 })
    if (!user.twoFactorPendingSecret) return NextResponse.json({ error: 'Start enrollment before verifying a code' }, { status: 400 })
    if (!verifyTotpToken(user.twoFactorPendingSecret, code)) return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 400 })

    const recoveryCodes = generateRecoveryCodes()
    const hashedRecoveryCodes = await hashRecoveryCodes(recoveryCodes)

    await prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: user.twoFactorPendingSecret,
        twoFactorPendingSecret: null,
        twoFactorRecoveryCodes: JSON.stringify(hashedRecoveryCodes),
        twoFactorEnrolledAt: new Date(),
        twoFactorLastUsedAt: new Date(),
      },
    })

    await prisma.auditLog.create({
      data: { userId: user.id, action: '2FA_ENABLED', entity: 'User', entityId: user.id, after: JSON.stringify({ recoveryCodesIssued: recoveryCodes.length }) },
    })

    return NextResponse.json({ success: true, recoveryCodes })
  } catch (error) {
    console.error('2FA verification error:', error)
    return NextResponse.json({ error: 'Failed to verify two-factor enrollment' }, { status: 500 })
  }
}
