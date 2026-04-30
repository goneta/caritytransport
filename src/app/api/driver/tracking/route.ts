import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { dispatchNotification } from '@/lib/notifications'
import { notifyParentsForTripEvent } from '@/lib/trip-event-notifications'

const ALLOWED_STATUSES = new Set([
  'ROUTE_SCHEDULED',
  'DEPARTED_DEPOT',
  'EN_ROUTE',
  'ARRIVED_PICKUP',
  'BOARDED',
  'ARRIVED_SCHOOL',
  'DROPPED',
  'COMPLETED',
])

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const userId = session.user.id

    const driver = await prisma.driver.findUnique({ where: { userId } })
    if (!driver) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })

    const body = await req.json()
    const scheduleId = String(body.scheduleId || '')
    const status = String(body.status || 'EN_ROUTE').toUpperCase()
    const latitude = body.latitude === null || body.latitude === undefined || body.latitude === '' ? null : Number(body.latitude)
    const longitude = body.longitude === null || body.longitude === undefined || body.longitude === '' ? null : Number(body.longitude)

    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
    if (!ALLOWED_STATUSES.has(status)) return NextResponse.json({ error: 'Invalid tracking status' }, { status: 400 })
    if ((latitude !== null && Number.isNaN(latitude)) || (longitude !== null && Number.isNaN(longitude))) {
      return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 })
    }

    const schedule = await prisma.transportSchedule.findFirst({
      where: { id: scheduleId, driverId: driver.id },
      include: { vehicle: true },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule is not assigned to this driver' }, { status: 403 })
    }

    const log = await prisma.tripLog.create({
      data: {
        scheduleId,
        driverId: driver.id,
        vehicleId: schedule.vehicleId || undefined,
        status,
        latitude,
        longitude,
        notes: body.notes ? String(body.notes).slice(0, 500) : 'Live tracking update from driver dashboard',
      },
      include: {
        schedule: { select: { routeName: true, departureTime: true } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
        driver: { include: { user: { select: { name: true } } } },
      },
    })

    const statusLabel = status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
    const routeName = log.schedule?.routeName || 'your child’s route'
    const vehicleLabel = log.vehicle?.regPlate || null
    let notifiedParents = 0

    if (status === 'BOARDED' || status === 'ARRIVED_SCHOOL' || status === 'DROPPED') {
      notifiedParents = await notifyParentsForTripEvent({
        scheduleId,
        status,
        vehicleLabel,
        departureTime: log.schedule?.departureTime,
        senderId: userId,
      })
    } else {
      const activeParents = await prisma.bookingItem.findMany({
        where: {
          scheduleId,
          status: 'ACTIVE',
          booking: { status: 'CONFIRMED' },
        },
        select: {
          pupil: { select: { fullName: true } },
          booking: { select: { userId: true } },
        },
        distinct: ['bookingId'],
      })

      await Promise.allSettled(
        activeParents.map((item) => dispatchNotification({
          recipientId: item.booking.userId,
          senderId: userId,
          type: 'PUSH',
          subject: `Trip update: ${statusLabel}`,
          message: `${routeName} is now ${statusLabel}. ${vehicleLabel ? `Vehicle: ${vehicleLabel}. ` : ''}${latitude !== null && longitude !== null ? `Live location has been updated. ` : ''}${item.pupil ? `Passenger: ${item.pupil.fullName}.` : ''}`,
          triggerEvent: `TRACKING_${status}`,
        }))
      )
      notifiedParents = activeParents.length
    }

    return NextResponse.json({ success: true, tracking: log, notifiedParents })
  } catch (error) {
    console.error('Driver tracking update error:', error)
    return NextResponse.json({ error: 'Failed to update live tracking' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const driver = await prisma.driver.findUnique({ where: { userId: session.user.id } })
    if (!driver) return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 })

    const updates = await prisma.tripLog.findMany({
      where: { driverId: driver.id },
      orderBy: { timestamp: 'desc' },
      take: 20,
      include: {
        schedule: { select: { id: true, routeName: true, departureTime: true } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
      },
    })

    return NextResponse.json({ updates })
  } catch (error) {
    console.error('Driver tracking fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch live tracking updates' }, { status: 500 })
  }
}
