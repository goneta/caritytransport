import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const view = searchParams.get('view') || 'list' // list | week
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const whereClause: Record<string, unknown> = {
      driverId: driver.id
    }

    const schedules = await prisma.transportSchedule.findMany({
      where: whereClause,
      include: {
        school: { select: { name: true, address: true } },
        vehicle: { select: { regPlate: true, make: true, model: true, type: true, seats: true } },
        seatAssignments: {
          include: {
            pupil: {
              select: { id: true, fullName: true, yearLevel: true, school: { select: { name: true } } }
            }
          }
        },
        _count: { select: { seatAssignments: true } }
      },
      orderBy: { departureTime: 'asc' }
    })

    // Get unavailability dates
    const unavailability = await prisma.driverUnavailability.findMany({
      where: { driverId: driver.id },
      orderBy: { date: 'asc' }
    })

    // Get trip logs (recent)
    const recentTrips = await prisma.tripLog.findMany({
      where: { driverId: driver.id },
      include: {
        schedule: { select: { routeName: true, direction: true } },
        vehicle: { select: { regPlate: true } },
        pupil: { select: { fullName: true } }
      },
      orderBy: { timestamp: 'desc' },
      take: 20
    })

    return NextResponse.json({ schedules, unavailability, recentTrips })
  } catch (error) {
    console.error('Driver schedule error:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}
