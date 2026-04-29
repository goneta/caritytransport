import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getAppUrl } from '@/lib/stripe'

export async function GET(req: NextRequest) {
  const appUrl = getAppUrl(req)

  try {
    const session = await auth()
    const bookingId = new URL(req.url).searchParams.get('bookingId')

    if (!session?.user?.id || !bookingId) {
      return NextResponse.redirect(`${appUrl}/parent/basket?checkout=cancelled`)
    }

    const userId = session.user.id

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        userId,
        status: 'PENDING',
      },
      include: { items: true },
    })

    if (!booking) {
      return NextResponse.redirect(`${appUrl}/parent/basket?checkout=cancelled`)
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancelReason: 'Stripe checkout cancelled by parent',
          cancelledAt: new Date(),
        },
      }),
      prisma.bookingItem.updateMany({
        where: { bookingId: booking.id },
        data: { status: 'CANCELLED' },
      }),
      prisma.payment.updateMany({
        where: { bookingId: booking.id },
        data: { status: 'CANCELLED' },
      }),
      prisma.basketItem.createMany({
        data: booking.items.map((item: any) => ({
          userId,
          scheduleId: item.scheduleId,
          pupilId: item.pupilId,
          seatNumber: item.seatNumber,
          direction: item.direction,
          tripDate: item.tripDate,
          price: item.price,
        })),
      }),
    ])

    return NextResponse.redirect(`${appUrl}/parent/basket?checkout=cancelled&restored=true`)
  } catch (error) {
    console.error('Stripe cancellation handler error:', error)
    return NextResponse.redirect(`${appUrl}/parent/basket?checkout=cancelled`)
  }
}
