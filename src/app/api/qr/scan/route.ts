import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import { generateIdentityCode } from '@/lib/identity-code'

async function resolveManualIdentityCode(code: string) {
  const normalized = code.trim().toUpperCase()

  const pupils = await prisma.pupil.findMany({
    select: { id: true, platformId: true }
  })
  const pupilMatch = pupils.find((pupil) => generateIdentityCode('PUPIL', pupil.id, pupil.platformId) === normalized)
  if (pupilMatch) {
    return { type: 'PUPIL' as const, pupilId: pupilMatch.id }
  }

  const users = await prisma.user.findMany({
    select: { id: true, platformId: true }
  })
  const userMatch = users.find((user) => generateIdentityCode('USER', user.id, user.platformId) === normalized)
  if (userMatch) {
    return { type: 'USER' as const, userId: userMatch.id }
  }

  return null
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { qrData, scheduleId } = await req.json()

    if (!qrData) {
      return NextResponse.json({ error: 'QR data required' }, { status: 400 })
    }

    let payload: Record<string, unknown>
    try {
      payload = typeof qrData === 'string' ? JSON.parse(qrData) : qrData
    } catch {
      const manualMatch = await resolveManualIdentityCode(String(qrData))
      if (!manualMatch || manualMatch.type !== 'PUPIL') {
        return NextResponse.json({ error: 'Invalid QR data format', valid: false }, { status: 400 })
      }
      payload = {
        type: 'PUPIL',
        pupilId: manualMatch.pupilId,
        identityCode: String(qrData).trim().toUpperCase(),
      }
    }

    if (payload.type !== 'PUPIL') {
      return NextResponse.json({
        valid: false,
        outcome: 'red',
        message: 'Not a pupil QR code'
      })
    }

    const pupilId = payload.pupilId as string

    const pupil = await prisma.pupil.findUnique({
      where: { id: pupilId },
      include: {
        parent: { include: { user: true } },
        school: true,
        seatAssignments: {
          where: scheduleId ? { scheduleId } : {},
          include: { schedule: true }
        },
        bookingItems: {
          where: {
            status: 'ACTIVE',
            ...(scheduleId ? { scheduleId } : {})
          }
        }
      }
    })

    if (!pupil) {
      return NextResponse.json({
        valid: false,
        outcome: 'red',
        message: 'Pupil not found'
      })
    }

    // Determine if pupil is booked on this schedule
    const hasBooking = scheduleId
      ? pupil.bookingItems.some((b: any) => b.scheduleId === scheduleId)
      : pupil.seatAssignments.length > 0

    const outcome = hasBooking ? 'green' : 'red'

    // Log the QR scan as a trip log
    if (scheduleId) {
      await prisma.tripLog.create({
        data: {
          scheduleId,
          pupilId,
          driverId: (await prisma.driver.findFirst({ where: { userId: session.user.id } }))?.id,
          status: hasBooking ? 'BOARDED' : 'ABSENT',
          qrScanned: true,
          notes: `QR scanned by driver ${session.user.id}`
        }
      })
    }

    return NextResponse.json({
      valid: true,
      outcome,
      message: hasBooking
        ? `✓ ${pupil.fullName} is booked on this route`
        : `✗ ${pupil.fullName} does NOT have an active booking`,
      pupil: {
        id: pupil.id,
        fullName: pupil.fullName,
        identityCode: generateIdentityCode('PUPIL', pupil.id, pupil.platformId),
        yearLevel: pupil.yearLevel,
        school: pupil.school?.name,
        specialRequirements: pupil.specialRequirements,
        parentName: pupil.parent.user.name,
        parentPhone: pupil.parent.user.phone,
        parentEmail: pupil.parent.user.email,
        pupilPhone: pupil.phone
      }
    })
  } catch (error) {
    console.error('QR scan error:', error)
    return NextResponse.json({ error: 'Failed to process QR scan' }, { status: 500 })
  }
}
