import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const parentUserId = searchParams.get('parentUserId') || ''

    const parent = await prisma.parent.findUnique({ where: { userId: parentUserId } })
    if (!parent) return NextResponse.json([])

    const pupils = await prisma.pupil.findMany({
      where: { parentId: parent.id },
      select: { id: true },
    })

    const pupilIds = pupils.map((p: { id: string }) => p.id)

    const assignments = await prisma.seatAssignment.findMany({
      where: {
        pupilId: { in: pupilIds },
        status: 'ASSIGNED',
      },
      include: {
        schedule: {
          include: {
            school: { select: { name: true } },
            driver: { include: { user: { select: { name: true, phone: true } } } },
            vehicle: { select: { regPlate: true, model: true, seats: true, type: true } },
          },
        },
        pupil: { select: { fullName: true, yearLevel: true } },
      },
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}
