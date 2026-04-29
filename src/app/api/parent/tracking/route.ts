import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

const STALE_AFTER_MINUTES = 15

function buildTimeline(logs: any[]) {
  const events = logs.map((log: any) => ({
    id: log.id,
    status: log.status,
    timestamp: log.timestamp,
    notes: log.notes,
    latitude: log.latitude,
    longitude: log.longitude,
    pupilId: log.pupilId,
  }))

  return events.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parent = await prisma.parent.findUnique({
      where: { userId: session.user.id },
      include: { pupils: { select: { id: true, fullName: true, studentNumber: true, pickupLocation: true, pickupPostcode: true } } },
    })

    if (!parent) return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 })

    const pupilIds = parent.pupils.map((pupil: any) => pupil.id)
    if (pupilIds.length === 0) return NextResponse.json([])

    const bookingItems = await prisma.bookingItem.findMany({
      where: {
        pupilId: { in: pupilIds },
        status: 'ACTIVE',
        booking: { is: { userId: session.user.id, status: 'CONFIRMED' } },
      } as any,
      include: {
        pupil: { select: { id: true, fullName: true, studentNumber: true, pickupLocation: true, pickupPostcode: true } },
        booking: { select: { id: true, status: true } },
        schedule: {
          include: {
            school: { select: { name: true, address: true, postcode: true } },
            vehicle: { select: { id: true, regPlate: true, type: true, make: true, model: true, colour: true } },
            driver: { include: { user: { select: { name: true, phone: true } } } },
          },
        },
      },
      orderBy: { tripDate: 'asc' },
      take: 50,
    } as any)

    const scheduleIds = Array.from(new Set((bookingItems as any[]).map((item: any) => item.scheduleId)))

    const logs = scheduleIds.length > 0
      ? await prisma.tripLog.findMany({
          where: { scheduleId: { in: scheduleIds } },
          orderBy: { timestamp: 'desc' },
          take: 300,
          include: {
            driver: { include: { user: { select: { name: true, phone: true } } } },
            vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
          },
        })
      : []

    const now = Date.now()
    const assignments = (bookingItems as any[]).map((item) => {
      const scheduleLogs = (logs as any[]).filter((log: any) => log.scheduleId === item.scheduleId)
      const pupilLogs = scheduleLogs.filter((log: any) => !log.pupilId || log.pupilId === item.pupilId)
      const latestLocation = scheduleLogs.find((log: any) => typeof log.latitude === 'number' && typeof log.longitude === 'number')
      const latestPupilEvent = pupilLogs[0]
      const latestTimestamp = latestLocation?.timestamp || latestPupilEvent?.timestamp || null
      const minutesSinceUpdate = latestTimestamp ? Math.round((now - new Date(latestTimestamp).getTime()) / 60000) : null

      return {
        id: item.id,
        bookingId: item.bookingId,
        tripDate: item.tripDate,
        direction: item.direction,
        seatNumber: item.seatNumber,
        status: item.status,
        pupil: item.pupil,
        schedule: item.schedule,
        live: {
          status: latestPupilEvent?.status || 'SCHEDULED',
          updatedAt: latestTimestamp,
          isLive: minutesSinceUpdate !== null && minutesSinceUpdate <= STALE_AFTER_MINUTES,
          minutesSinceUpdate,
          location: latestLocation
            ? {
                latitude: latestLocation.latitude,
                longitude: latestLocation.longitude,
                timestamp: latestLocation.timestamp,
                status: latestLocation.status,
                notes: latestLocation.notes,
              }
            : null,
          timeline: buildTimeline(pupilLogs.slice(0, 20)),
        },
      }
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Parent tracking error:', error)
    return NextResponse.json({ error: 'Failed to fetch live tracking' }, { status: 500 })
  }
}
