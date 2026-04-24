import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const items = await prisma.basketItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'asc' },
    })

    // Enrich with schedule and pupil details
    const enriched = await Promise.all(items.map(async (item: any) => {
      const [schedule, pupil] = await Promise.all([
        prisma.transportSchedule.findUnique({
          where: { id: item.scheduleId },
          include: {
            school: { select: { name: true } },
            vehicle: { select: { regPlate: true, type: true, model: true, make: true, seats: true } },
            driver: { include: { user: { select: { name: true } } } },
          },
        }),
        prisma.pupil.findUnique({
          where: { id: item.pupilId },
          select: { fullName: true, studentNumber: true },
        }),
      ])

      return {
        ...item,
        schedule,
        pupil,
      }
    }))

    return NextResponse.json(enriched)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch basket' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { scheduleId, pupilId, seatNumber, direction, tripDate, price } = data

    if (!scheduleId || !pupilId || !seatNumber || !direction || !tripDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check if seat is still available for this date
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
    if (!schedule.vehicle) return NextResponse.json({ error: 'No vehicle assigned to this route' }, { status: 400 })

    const takenSeats = schedule.bookingItems.map((bi: any) => bi.seatNumber)
    if (takenSeats.includes(seatNumber)) {
      return NextResponse.json({ error: 'Seat is already taken' }, { status: 409 })
    }

    // Check if same seat already in basket (another user)
    const existingInBasket = await prisma.basketItem.findFirst({
      where: {
        scheduleId,
        seatNumber,
        tripDate: new Date(tripDate),
        direction,
      },
    })
    if (existingInBasket) {
      return NextResponse.json({ error: 'Seat is already reserved in another basket' }, { status: 409 })
    }

    // Check if this pupil already has a booking for this schedule/date
    const existingBooking = await prisma.bookingItem.findFirst({
      where: {
        pupilId,
        scheduleId,
        tripDate: new Date(tripDate),
        direction,
        status: 'ACTIVE',
      },
    })
    if (existingBooking) {
      return NextResponse.json({ error: 'Pupil already has a booking for this route and date' }, { status: 409 })
    }

    // Check if pupil already in basket for same route/date
    const existingBasketItem = await prisma.basketItem.findFirst({
      where: {
        userId: session.user.id,
        pupilId,
        scheduleId,
        tripDate: new Date(tripDate),
        direction,
      },
    })
    if (existingBasketItem) {
      return NextResponse.json({ error: 'This trip is already in your basket' }, { status: 409 })
    }

    const item = await prisma.basketItem.create({
      data: {
        userId: session.user.id,
        scheduleId,
        pupilId,
        seatNumber,
        direction,
        tripDate: new Date(tripDate),
        price: price || schedule.pricePerSeat,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to add to basket' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('id')

    if (itemId) {
      await prisma.basketItem.deleteMany({
        where: { id: itemId, userId: session.user.id },
      })
    } else {
      // Clear entire basket
      await prisma.basketItem.deleteMany({
        where: { userId: session.user.id },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to remove from basket' }, { status: 500 })
  }
}
