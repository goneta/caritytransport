import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const pupilName = searchParams.get('pupil') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const vehicleId = searchParams.get('vehicleId') || ''
    const schoolId = searchParams.get('schoolId') || ''
    const status = searchParams.get('status') || ''
    const format = searchParams.get('format') || ''

    const bookings = await prisma.booking.findMany({
      where: {
        ...(status && { status }),
        items: {
          some: {
            ...(vehicleId && { schedule: { vehicleId } }),
            ...(schoolId && { schedule: { schoolId } }),
            ...(pupilName && { pupil: { fullName: { contains: pupilName } } }),
            ...(dateFrom && dateTo && {
              tripDate: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
              },
            }),
          },
        },
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            schedule: {
              include: {
                school: { select: { name: true } },
                vehicle: { select: { regPlate: true, type: true, model: true } },
                driver: { include: { user: { select: { name: true } } } },
              },
            },
            pupil: { select: { fullName: true, studentNumber: true, yearLevel: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (format === 'csv') {
      type BookingWithItems = typeof bookings[number]
      type BookingItemType = BookingWithItems['items'][number]
      const rows = [
        ['Booking ID', 'Parent', 'Email', 'Pupil', 'Route', 'School', 'Vehicle', 'Seat', 'Date', 'Direction', 'Price', 'Status'].join(','),
        ...bookings.flatMap((b: BookingWithItems) =>
          b.items.map((item: BookingItemType) =>
            [
              b.id,
              b.user?.name || '',
              b.user?.email || '',
              item.pupil?.fullName || '',
              item.schedule?.routeName || '',
              item.schedule?.school?.name || '',
              item.schedule?.vehicle?.regPlate || '',
              item.seatNumber,
              new Date(item.tripDate).toLocaleDateString('en-GB'),
              item.direction,
              `£${item.price.toFixed(2)}`,
              b.status,
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
          )
        ),
      ].join('\n')

      return new NextResponse(rows, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="bookings.csv"',
        },
      })
    }

    return NextResponse.json(bookings)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}

// Admin direct booking (bypasses payment)
export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { userId, scheduleId, pupilId, seatNumber, direction, tripDate, price } = data

    if (!userId || !scheduleId || !pupilId || !seatNumber || !direction || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check seat availability
    const schedule = await prisma.transportSchedule.findUnique({
      where: { id: scheduleId },
      include: {
        vehicle: true,
        bookingItems: {
          where: {
            tripDate: new Date(tripDate),
            status: 'ACTIVE',
          },
        },
      },
    })

    if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    if (!schedule.vehicle) return NextResponse.json({ error: 'No vehicle assigned' }, { status: 400 })

    const takenSeats = schedule.bookingItems.map(
      (bi: { seatNumber: number }) => bi.seatNumber
    )
    if (takenSeats.includes(seatNumber)) {
      return NextResponse.json({ error: 'Seat already taken' }, { status: 409 })
    }

    // Check payment validation for user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const booking = await prisma.booking.create({
      data: {
        userId,
        status: 'CONFIRMED',
        totalAmount: price || 0,
        items: {
          create: {
            scheduleId,
            pupilId,
            seatNumber,
            direction,
            tripDate: new Date(tripDate),
            price: price || 0,
            status: 'ACTIVE',
          },
        },
        payment: {
          create: {
            amount: price || 0,
            currency: 'GBP',
            status: 'COMPLETED',
            paidAt: new Date(),
          },
        },
      },
      include: { items: true, payment: true },
    })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'CREATE',
      entity: 'Booking',
      entityId: booking.id,
      before: null,
      after: booking,
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const before = await prisma.booking.findUnique({ where: { id }, include: { items: true, payment: true } })

    const booking = await prisma.booking.update({
      where: { id },
      data: {
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.cancelReason !== undefined && { cancelReason: fields.cancelReason }),
      },
    })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'UPDATE',
      entity: 'Booking',
      entityId: booking.id,
      before,
      after: booking,
    })

    return NextResponse.json(booking)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const before = await prisma.booking.findUnique({ where: { id }, include: { items: true, payment: true } })
    await prisma.booking.delete({ where: { id } })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'DELETE',
      entity: 'Booking',
      entityId: id,
      before,
      after: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete booking' }, { status: 500 })
  }
}
