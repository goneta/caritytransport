import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const schoolId = searchParams.get('schoolId') || ''
    const vehicleType = searchParams.get('vehicleType') || ''
    const pickupPostcode = searchParams.get('pickupPostcode') || ''
    const serviceType = searchParams.get('serviceType') || ''

    const schedules = await prisma.transportSchedule.findMany({
      where: {
        ...(status && { status }),
        ...(schoolId && { schoolId }),
        ...(vehicleType && { vehicle: { type: vehicleType } }),
        ...(pickupPostcode && { pickupPostcode: { contains: pickupPostcode.toUpperCase() } }),
        ...(serviceType && { serviceType }),
      },
      include: {
        school: { select: { name: true } },
        driver: { include: { user: { select: { name: true, phone: true } } } },
        vehicle: { select: { regPlate: true, model: true, make: true, seats: true, type: true, licenceClass: true } },
        seatAssignments: {
          where: { status: 'ASSIGNED' },
          include: {
            pupil: { select: { fullName: true, studentNumber: true } },
          },
        },
        _count: { select: { seatAssignments: { where: { status: 'ASSIGNED' } } } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(schedules)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()

    // Validate required fields
    if (!data.routeName || !data.departureTime || !data.direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate vehicle capacity vs requested seats
    if (data.vehicleId && data.seats) {
      const vehicle = await prisma.vehicle.findUnique({ where: { id: data.vehicleId } })
      if (vehicle && data.seats > vehicle.seats) {
        return NextResponse.json({ error: `Seat count (${data.seats}) exceeds vehicle capacity (${vehicle.seats})` }, { status: 400 })
      }
    }

    // Check for driver conflicts
    if (data.driverId && data.departureTime && data.scheduleDate) {
      const conflict = await prisma.transportSchedule.findFirst({
        where: {
          driverId: data.driverId,
          departureTime: data.departureTime,
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          ...(data.scheduleDate && { scheduleDate: new Date(data.scheduleDate) }),
        },
      })
      if (conflict) {
        return NextResponse.json({ error: 'Driver already assigned to another route at this time' }, { status: 409 })
      }
    }

    // Validate driver licence class matches vehicle type
    if (data.driverId && data.vehicleId) {
      const [driver, vehicle] = await Promise.all([
        prisma.driver.findUnique({ where: { id: data.driverId } }),
        prisma.vehicle.findUnique({ where: { id: data.vehicleId } }),
      ])
      if (driver && vehicle) {
        const classMap: Record<string, string[]> = {
          BUS: ['PCV'],
          MINIBUS: ['PCV', 'MINIBUS'],
          CAR: ['CAR', 'MINIBUS', 'PCV'],
        }
        const allowed = classMap[vehicle.type] || []
        if (driver.licenceClass && !allowed.includes(driver.licenceClass)) {
          return NextResponse.json({
            error: `Driver licence class (${driver.licenceClass}) does not permit driving ${vehicle.type}`,
          }, { status: 400 })
        }
      }
    }

    const schedule = await prisma.transportSchedule.create({
      data: {
        routeName: data.routeName,
        serviceType: data.serviceType || 'BOTH',
        direction: data.direction,
        schoolId: data.schoolId || null,
        vehicleId: data.vehicleId || null,
        driverId: data.driverId || null,
        departureTime: data.departureTime,
        arrivalTime: data.arrivalTime || null,
        scheduleDate: data.scheduleDate ? new Date(data.scheduleDate) : null,
        recurrence: data.recurrence || 'WEEKDAYS',
        customDays: data.customDays ? JSON.stringify(data.customDays) : null,
        pickupPostcode: data.pickupPostcode || null,
        dropoffPostcode: data.dropoffPostcode || null,
        pickupStops: data.pickupStops ? JSON.stringify(data.pickupStops) : null,
        dropoffLocation: data.dropoffLocation || null,
        pricePerSeat: data.pricePerSeat || 0,
        status: 'SCHEDULED',
      },
      include: {
        school: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
        vehicle: { select: { regPlate: true, model: true, seats: true, type: true } },
      },
    })

    return NextResponse.json(schedule, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const schedule = await prisma.transportSchedule.update({
      where: { id },
      data: {
        ...(fields.routeName !== undefined && { routeName: fields.routeName }),
        ...(fields.serviceType !== undefined && { serviceType: fields.serviceType }),
        ...(fields.direction !== undefined && { direction: fields.direction }),
        ...(fields.schoolId !== undefined && { schoolId: fields.schoolId }),
        ...(fields.vehicleId !== undefined && { vehicleId: fields.vehicleId }),
        ...(fields.driverId !== undefined && { driverId: fields.driverId }),
        ...(fields.departureTime !== undefined && { departureTime: fields.departureTime }),
        ...(fields.arrivalTime !== undefined && { arrivalTime: fields.arrivalTime }),
        ...(fields.recurrence !== undefined && { recurrence: fields.recurrence }),
        ...(fields.customDays !== undefined && { customDays: fields.customDays ? JSON.stringify(fields.customDays) : null }),
        ...(fields.pickupPostcode !== undefined && { pickupPostcode: fields.pickupPostcode }),
        ...(fields.dropoffPostcode !== undefined && { dropoffPostcode: fields.dropoffPostcode }),
        ...(fields.pricePerSeat !== undefined && { pricePerSeat: fields.pricePerSeat }),
        ...(fields.status !== undefined && { status: fields.status }),
      },
    })

    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.transportSchedule.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
