import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { pupilId } = await req.json()

    const schedule = await prisma.transportSchedule.findUnique({
      where: { id },
      include: {
        vehicle: true,
        seatAssignments: { where: { status: 'ASSIGNED' } },
      },
    })

    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })

    const existing = await prisma.seatAssignment.findFirst({
      where: { scheduleId: id, pupilId, status: { in: ['ASSIGNED', 'WAITLISTED'] } },
    })
    if (existing) return NextResponse.json({ error: 'Pupil already assigned to this route' }, { status: 409 })

    const capacity = schedule.vehicle?.seats || 0
    const assigned = schedule.seatAssignments.length

    if (assigned >= capacity && capacity > 0) {
      const assignment = await prisma.seatAssignment.create({
        data: { scheduleId: id, pupilId, status: 'WAITLISTED' },
      })
      return NextResponse.json({ ...assignment, waitlisted: true })
    }

    const assignment = await prisma.seatAssignment.create({
      data: {
        scheduleId: id,
        pupilId,
        seatNumber: assigned + 1,
        status: 'ASSIGNED',
      },
    })

    return NextResponse.json({ ...assignment, waitlisted: false }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to assign pupil' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { pupilId } = await req.json()
    await prisma.seatAssignment.deleteMany({
      where: { scheduleId: id, pupilId },
    })
    return NextResponse.json({ message: 'Pupil removed from route' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove pupil' }, { status: 500 })
  }
}
