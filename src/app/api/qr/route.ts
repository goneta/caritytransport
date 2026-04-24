import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { generateQRDataURL, buildUserQRPayload, buildPupilQRPayload } from '@/lib/qr'

// GET /api/qr?pupilId=xxx  → returns QR for a specific pupil
// GET /api/qr              → returns QR for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const pupilId = searchParams.get('pupilId')

    if (pupilId) {
      // Return pupil QR - verify parent owns this pupil
      const pupil = await prisma.pupil.findFirst({
        where: {
          id: pupilId,
          ...(!(session.user as any).role?.includes('ADMIN') && {
            parent: { userId: session.user.id },
          }),
        },
        include: {
          parent: { include: { user: { select: { phone: true, name: true } } } },
        },
      })
      if (!pupil) return NextResponse.json({ error: 'Pupil not found' }, { status: 404 })

      const payload = buildPupilQRPayload(pupil)
      const qrDataURL = await generateQRDataURL(payload)
      return NextResponse.json({ qrDataURL, payload: JSON.parse(payload), platformId: pupil.platformId })
    }

    // Return the current user's QR
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const payload = buildUserQRPayload(user)
    const qrDataURL = await generateQRDataURL(payload)
    return NextResponse.json({ qrDataURL, payload: JSON.parse(payload), platformId: user.platformId })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
