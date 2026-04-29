import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

function minutesAgo(date: Date) {
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    const schedules = await prisma.transportSchedule.findMany({
      where: {
        OR: [
          { status: { in: ['SCHEDULED', 'ACTIVE'] } },
          { bookingItems: { some: { tripDate: { gte: today, lt: tomorrow }, status: 'ACTIVE' } } },
          { tripLogs: { some: { timestamp: { gte: today } } } },
        ],
      },
      orderBy: { departureTime: 'asc' },
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true, seats: true } },
        tripLogs: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: { id: true, status: true, timestamp: true, latitude: true, longitude: true, notes: true },
        },
        _count: { select: { bookingItems: true, tripLogs: true } },
      },
    })

    const routes = schedules.map((schedule) => {
      const latestLog = schedule.tripLogs[0] || null
      const isStale = latestLog ? minutesAgo(latestLog.timestamp) > 15 : true

      return {
        id: schedule.id,
        routeName: schedule.routeName,
        status: latestLog?.status || schedule.status,
        scheduleStatus: schedule.status,
        departureTime: schedule.departureTime,
        driverName: schedule.driver?.user?.name || 'Unassigned',
        driverPhone: schedule.driver?.user?.phone || null,
        vehicle: schedule.vehicle
          ? `${schedule.vehicle.regPlate} · ${schedule.vehicle.make || schedule.vehicle.type || 'Vehicle'}${schedule.vehicle.model ? ` ${schedule.vehicle.model}` : ''}`
          : 'Unassigned vehicle',
        capacity: schedule.vehicle?.seats || 0,
        activeBookings: schedule._count.bookingItems,
        totalUpdates: schedule._count.tripLogs,
        latitude: latestLog?.latitude ?? null,
        longitude: latestLog?.longitude ?? null,
        lastUpdateAt: latestLog?.timestamp ?? null,
        lastUpdateMinutesAgo: latestLog ? minutesAgo(latestLog.timestamp) : null,
        stale: isStale,
        notes: latestLog?.notes || null,
      }
    })

    const metrics = {
      liveRoutes: routes.filter((route) => route.latitude !== null && route.longitude !== null).length,
      staleRoutes: routes.filter((route) => route.stale).length,
      activeRoutes: routes.filter((route) => ['ACTIVE', 'EN_ROUTE', 'DEPARTED_DEPOT', 'ARRIVED_PICKUP', 'BOARDED'].includes(route.status)).length,
      totalRoutes: routes.length,
    }

    return NextResponse.json({ routes, metrics, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('Admin operations map error:', error)
    return NextResponse.json({ error: 'Failed to load live operations map data' }, { status: 500 })
  }
}
