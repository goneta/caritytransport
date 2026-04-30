import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { buildCapacityForecast } from '@/lib/capacity-forecasting'

export async function GET() {
  try {
    const forecastCutoff = new Date()
    forecastCutoff.setDate(forecastCutoff.getDate() - 365)

    const [
      totalPupils,
      activeRoutes,
      vehiclesInUse,
      driversOnDuty,
      pendingParents,
      recentActivity,
      expiringLicences,
      expiringInsurance,
      fullVehicles,
      totalParents,
      todaySchedules,
      forecastSchedules,
      forecastBookingItems,
    ] = await Promise.all([
      prisma.pupil.count({ where: { status: 'ACTIVE', activeTransport: true } }),
      prisma.transportSchedule.count({ where: { status: { in: ['SCHEDULED', 'ACTIVE'] } } }),
      prisma.transportSchedule.count({ where: { status: 'ACTIVE', vehicleId: { not: null } } }),
      prisma.driver.count({ where: { driverStatus: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'PARENT', status: 'PENDING' } }),
      prisma.auditLog.findMany({
        take: 20,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, email: true } } },
      }),
      prisma.driver.findMany({
        where: {
          licenceExpiry: {
            lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
        include: { user: { select: { name: true } } },
      }),
      prisma.transportCompany.findMany({
        where: {
          insuranceExpiry: {
            lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            gte: new Date(),
          },
        },
      }),
      prisma.transportSchedule.findMany({
        where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
        include: {
          vehicle: true,
          _count: { select: { seatAssignments: { where: { status: 'ASSIGNED' } } } },
        },
      }),
      prisma.user.count({ where: { role: 'PARENT' } }),
      prisma.transportSchedule.findMany({
        where: { status: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] } },
        orderBy: { departureTime: 'asc' },
        include: {
          school: { select: { name: true } },
          driver: { include: { user: { select: { name: true } } } },
          vehicle: { select: { regPlate: true, seats: true } },
          _count: { select: { seatAssignments: { where: { status: 'ASSIGNED' } } } },
        },
        take: 10,
      }),
      prisma.transportSchedule.findMany({
        where: { status: { in: ['SCHEDULED', 'ACTIVE', 'COMPLETED'] } },
        select: {
          id: true,
          routeName: true,
          direction: true,
          serviceType: true,
          departureTime: true,
          status: true,
          school: { select: { name: true } },
          vehicle: { select: { seats: true } },
          _count: { select: { seatAssignments: { where: { status: 'ASSIGNED' } } } },
        },
      }),
      prisma.bookingItem.findMany({
        where: {
          tripDate: { gte: forecastCutoff, lte: new Date() },
          status: { notIn: ['CANCELLED', 'REFUNDED', 'VOID'] },
          booking: { status: { notIn: ['CANCELLED', 'REFUNDED', 'VOID'] } },
        },
        orderBy: { tripDate: 'desc' },
        take: 5000,
        include: {
          booking: { select: { status: true } },
          schedule: {
            select: {
              id: true,
              routeName: true,
              direction: true,
              serviceType: true,
              departureTime: true,
              school: { select: { name: true } },
            },
          },
        },
      }),
    ])

    const fullVehiclesAlert = fullVehicles.filter((s: any) => {
      const assigned = s._count?.seatAssignments || 0
      const capacity = s.vehicle?.seats || 0
      return assigned >= capacity
    })

    return NextResponse.json({
      metrics: {
        totalPupils,
        activeRoutes,
        vehiclesInUse,
        driversOnDuty,
        totalParents,
      },
      pendingActions: {
        pendingParents,
        expiringLicences: expiringLicences.length,
        expiringInsurance: expiringInsurance.length,
        fullVehicles: fullVehiclesAlert.length,
      },
      recentActivity,
      todaySchedules,
      expiringLicences,
      expiringInsurance,
      capacityForecast: buildCapacityForecast(forecastSchedules, forecastBookingItems),
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
