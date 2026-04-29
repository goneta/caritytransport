import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

async function getDriverId(userId: string) {
  const driver = await prisma.driver.findFirst({ where: { userId } })
  return driver?.id || null
}

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const driverId = await getDriverId(session.user.id)
    if (!driverId) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

    const scheduleId = new URL(req.url).searchParams.get('scheduleId')
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId required' }, { status: 400 })

    const schedule = await prisma.transportSchedule.findFirst({
      where: { id: scheduleId, driverId },
      include: {
        seatAssignments: {
          include: {
            pupil: true,
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const now = new Date()
    const logs = await prisma.tripLog.findMany({
      where: {
        driverId,
        scheduleId,
        status: { in: ['BOARDED', 'ABSENT'] },
        timestamp: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
      orderBy: { timestamp: 'desc' },
    })

    const latestByPupil = new Map<string, 'BOARDED' | 'ABSENT'>()
    for (const log of logs) {
      if (log.pupilId && !latestByPupil.has(log.pupilId)) {
        latestByPupil.set(log.pupilId, log.status as 'BOARDED' | 'ABSENT')
      }
    }

    return NextResponse.json({
      schedule,
      attendance: Object.fromEntries(latestByPupil),
      savedAt: logs[0]?.timestamp || null,
    })
  } catch (error) {
    console.error('Driver attendance GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const driverId = await getDriverId(session.user.id)
    if (!driverId) return NextResponse.json({ error: 'Driver not found' }, { status: 404 })

    const { scheduleId, attendance } = await req.json()
    if (!scheduleId || !attendance || typeof attendance !== 'object') {
      return NextResponse.json({ error: 'scheduleId and attendance are required' }, { status: 400 })
    }

    const schedule = await prisma.transportSchedule.findFirst({
      where: { id: scheduleId, driverId },
      include: {
        seatAssignments: {
          where: { status: 'ASSIGNED' },
          include: { pupil: true },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const now = new Date()
    const pupilIds = schedule.seatAssignments.map((assignment: any) => assignment.pupilId)

    await prisma.tripLog.deleteMany({
      where: {
        driverId,
        scheduleId,
        pupilId: { in: pupilIds },
        status: { in: ['BOARDED', 'ABSENT'] },
        timestamp: {
          gte: startOfDay(now),
          lte: endOfDay(now),
        },
      },
    })

    const entries = schedule.seatAssignments.map((assignment: any) => ({
      scheduleId,
      driverId,
      vehicleId: schedule.vehicleId,
      pupilId: assignment.pupilId,
      status: attendance[assignment.pupilId] === 'ABSENT' ? 'ABSENT' : 'BOARDED',
      qrScanned: false,
      notes: 'Attendance confirmed by driver',
      timestamp: now,
    }))

    if (entries.length > 0) {
      await prisma.tripLog.createMany({ data: entries })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ATTENDANCE_UPDATED',
        entity: 'TripLog',
        entityId: scheduleId,
        after: JSON.stringify({ attendance }),
      },
    })

    return NextResponse.json({ success: true, savedAt: now.toISOString() })
  } catch (error) {
    console.error('Driver attendance POST error:', error)
    return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 })
  }
}
