import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { getSecurityPolicy, getTwoFactorPolicyRequirement, isTwoFactorEligibleRole } from '@/lib/two-factor'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, twoFactorEnabled: true, twoFactorEnrolledAt: true, twoFactorLastUsedAt: true, twoFactorRecoveryCodes: true },
    })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const policy = await getSecurityPolicy()
    const recoveryCodesRemaining = user.twoFactorRecoveryCodes ? (JSON.parse(user.twoFactorRecoveryCodes) as string[]).length : 0

    return NextResponse.json({
      eligible: isTwoFactorEligibleRole(user.role),
      enabled: user.twoFactorEnabled,
      enrolledAt: user.twoFactorEnrolledAt,
      lastUsedAt: user.twoFactorLastUsedAt,
      recoveryCodesRemaining,
      policy: {
        requireAdminTwoFactor: policy.requireAdminTwoFactor,
        requireDriverTwoFactor: policy.requireDriverTwoFactor,
        requiredForCurrentUser: getTwoFactorPolicyRequirement(user.role, policy),
      },
    })
  } catch (error) {
    console.error('2FA status error:', error)
    return NextResponse.json({ error: 'Failed to load two-factor status' }, { status: 500 })
  }
}
