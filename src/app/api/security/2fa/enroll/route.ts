import { NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { generateBase32Secret, isTwoFactorEligibleRole, makeOtpAuthUrl } from '@/lib/two-factor'

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, email: true, role: true, twoFactorEnabled: true } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (!isTwoFactorEligibleRole(user.role)) return NextResponse.json({ error: 'Two-factor authentication is currently available for admin and driver accounts only' }, { status: 403 })
    if (user.twoFactorEnabled) return NextResponse.json({ error: 'Two-factor authentication is already enabled' }, { status: 400 })

    const secret = generateBase32Secret()
    const otpAuthUrl = makeOtpAuthUrl(user.email, secret)
    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { margin: 1, width: 220 })

    await prisma.user.update({ where: { id: user.id }, data: { twoFactorPendingSecret: secret } })

    await prisma.auditLog.create({
      data: { userId: user.id, action: '2FA_ENROLLMENT_STARTED', entity: 'User', entityId: user.id, after: JSON.stringify({ role: user.role }) },
    })

    return NextResponse.json({ secret, otpAuthUrl, qrDataUrl })
  } catch (error) {
    console.error('2FA enrollment error:', error)
    return NextResponse.json({ error: 'Failed to start two-factor enrollment' }, { status: 500 })
  }
}
