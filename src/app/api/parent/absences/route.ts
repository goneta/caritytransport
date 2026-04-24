import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pupilId = searchParams.get('pupilId') || ''

    const absences = await prisma.absence.findMany({
      where: { ...(pupilId && { pupilId }) },
      include: { pupil: { select: { fullName: true } } },
      orderBy: { date: 'desc' },
    })
    return NextResponse.json(absences)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch absences' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { pupilId, date, reason } = await req.json()

    // Check not more than 48h in advance validation is handled by frontend
    const absence = await prisma.absence.create({
      data: {
        pupilId,
        date: new Date(date),
        reason: reason || null,
        notified: false,
      },
    })

    // Get pupil for notification context
    const pupil = await prisma.pupil.findUnique({
      where: { id: pupilId },
      include: {
        seatAssignments: {
          where: { status: 'ASSIGNED' },
          include: { schedule: { include: { driver: { include: { user: true } } } } },
        },
      },
    })

    return NextResponse.json(absence, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to report absence' }, { status: 500 })
  }
}
