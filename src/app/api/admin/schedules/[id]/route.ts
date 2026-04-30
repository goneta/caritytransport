import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const schedule = await prisma.transportSchedule.findUnique({
      where: { id },
      include: {
        school: true,
        driver: { include: { user: true } },
        vehicle: { include: { company: true } },
        seatAssignments: {
          include: {
            pupil: {
              include: {
                parent: { include: { user: { select: { name: true, phone: true } } } },
                school: { select: { name: true } },
              },
            },
          },
        },
        bookingItems: {
          where: { status: 'ACTIVE' },
          include: {
            pupil: { select: { fullName: true } },
            booking: { include: { user: { select: { name: true, email: true } } } },
          },
        },
      },
    })
    if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const data = await req.json()

    // Check driver conflict if updating driver
    if (data.driverId && data.departureTime) {
      const conflict = await prisma.transportSchedule.findFirst({
        where: {
          driverId: data.driverId,
          departureTime: data.departureTime,
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          id: { not: id },
        },
      })
      if (conflict) {
        return NextResponse.json({ error: 'Driver already assigned to another route at this time' }, { status: 409 })
      }
    }

    const before = await prisma.transportSchedule.findUnique({ where: { id }, include: { school: true, vehicle: true, driver: true, seatAssignments: true } })

    const schedule = await prisma.transportSchedule.update({
      where: { id },
      data: {
        routeName: data.routeName,
        serviceType: data.serviceType,
        direction: data.direction,
        schoolId: data.schoolId || null,
        vehicleId: data.vehicleId || null,
        driverId: data.driverId || null,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime || null,
        recurrence: data.recurrence,
        customDays: data.customDays ? JSON.stringify(data.customDays) : null,
        pickupPostcode: data.pickupPostcode || null,
        dropoffPostcode: data.dropoffPostcode || null,
        pickupStops: data.pickupStops ? JSON.stringify(data.pickupStops) : null,
        dropoffLocation: data.dropoffLocation || null,
        pricePerSeat: data.pricePerSeat || 0,
        status: data.status,
      },
    })

    await writeAdminAuditLogForRequest({ request: req, action: 'UPDATE', entity: 'TransportSchedule', entityId: id, before, after: schedule })

    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const before = await prisma.transportSchedule.findUnique({ where: { id }, include: { school: true, vehicle: true, driver: true, seatAssignments: true } })
    await prisma.transportSchedule.delete({ where: { id } })
    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'TransportSchedule', entityId: id, before, after: null })
    return NextResponse.json({ message: 'Schedule deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
