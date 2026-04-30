import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { parseGuardianQrPayload, verifyGuardianPickup } from '@/lib/guardian-verification'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    let pupilId = data.pupilId ? String(data.pupilId) : ''
    const scheduleId = data.scheduleId ? String(data.scheduleId) : null
    const verificationCode = data.verificationCode ? String(data.verificationCode) : null
    let qrData: string | Record<string, unknown> | null = null

    if (verificationCode) {
      try {
        const parsed = JSON.parse(verificationCode)
        const guardianPayload = parseGuardianQrPayload(parsed)
        if (guardianPayload) {
          pupilId = guardianPayload.pupilId
          qrData = parsed
        }
      } catch {
        qrData = null
      }
    }

    if (!pupilId) return NextResponse.json({ error: 'Pupil is required', valid: false, outcome: 'red', message: 'Select a pupil before verifying release' }, { status: 400 })
    if (!verificationCode && !qrData) return NextResponse.json({ error: 'Guardian PIN or QR code is required', valid: false, outcome: 'red', message: 'Guardian PIN or QR code is required' }, { status: 400 })

    const result = await verifyGuardianPickup({ sessionUserId: session.user.id, pupilId, scheduleId, verificationCode, qrData })
    return NextResponse.json(result.response, { status: result.status })
  } catch (error) {
    console.error('Guardian pickup verification error:', error)
    return NextResponse.json({ error: 'Failed to verify guardian pickup', valid: false, outcome: 'red', message: 'Failed to verify guardian pickup' }, { status: 500 })
  }
}
