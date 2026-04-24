import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id

    // Fetch basket items
    const basketItems = await prisma.basketItem.findMany({
      where: { userId },
    })

    if (basketItems.length === 0) {
      return NextResponse.json({ error: 'Basket is empty' }, { status: 400 })
    }

    // Real-time seat conflict check: validate all seats are still available
    const conflicts: string[] = []
    for (const item of basketItems) {
      const existingBooking = await prisma.bookingItem.findFirst({
        where: {
          scheduleId: item.scheduleId,
          seatNumber: item.seatNumber,
          tripDate: item.tripDate,
          direction: item.direction,
          status: 'ACTIVE',
        },
      })
      if (existingBooking) {
        conflicts.push(`Seat ${item.seatNumber} on ${new Date(item.tripDate).toLocaleDateString('en-GB')} is no longer available`)
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json({
        error: 'Seat conflict detected',
        conflicts,
      }, { status: 409 })
    }

    const totalAmount = basketItems.reduce((sum: number, item: any) => sum + item.price, 0)

    // In production, create a Stripe checkout session here
    // For demo, simulate successful payment and create confirmed booking
    const stripeSessionId = `demo_session_${Date.now()}`

    // Create the booking with all items
    const booking = await prisma.booking.create({
      data: {
        userId,
        status: 'CONFIRMED',
        totalAmount,
        stripeSessionId,
        items: {
          create: basketItems.map((item: any) => ({
            scheduleId: item.scheduleId,
            pupilId: item.pupilId,
            seatNumber: item.seatNumber,
            direction: item.direction,
            tripDate: item.tripDate,
            price: item.price,
            status: 'ACTIVE',
          })),
        },
        payment: {
          create: {
            amount: totalAmount,
            currency: 'GBP',
            status: 'COMPLETED',
            stripeSessionId,
            paidAt: new Date(),
          },
        },
      },
      include: { items: true, payment: true },
    })

    // Clear basket
    await prisma.basketItem.deleteMany({ where: { userId } })

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      totalAmount,
      message: 'Payment successful. Booking confirmed!',
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
