import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getAppUrl, getStripeClient, toStripeAmount } from '@/lib/stripe'

const SEAT_HOLD_MINUTES = 30

function seatHoldCutoff() {
  return new Date(Date.now() - SEAT_HOLD_MINUTES * 60 * 1000)
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const userId = session.user.id

    const basketItems = await prisma.basketItem.findMany({
      where: { userId },
      include: {
        schedule: {
          include: {
            school: { select: { name: true } },
            vehicle: { select: { regPlate: true, type: true } },
          },
        },
        pupil: { select: { fullName: true } },
      } as any,
      orderBy: { createdAt: 'asc' },
    } as any)

    if (basketItems.length === 0) {
      return NextResponse.json({ error: 'Basket is empty' }, { status: 400 })
    }

    const conflicts: string[] = []
    const holdCutoff = seatHoldCutoff()

    for (const item of basketItems as any[]) {
      const existingBooking = await prisma.bookingItem.findFirst({
        where: {
          scheduleId: item.scheduleId,
          seatNumber: item.seatNumber,
          tripDate: item.tripDate,
          direction: item.direction,
          status: { in: ['ACTIVE', 'PENDING'] },
          booking: {
            is: {
              OR: [
                { status: 'CONFIRMED' },
                { status: 'PENDING', createdAt: { gte: holdCutoff } },
              ],
            },
          },
        } as any,
      })

      if (existingBooking) {
        conflicts.push(`Seat ${item.seatNumber} on ${new Date(item.tripDate).toLocaleDateString('en-GB')} is no longer available`)
      }
    }

    if (conflicts.length > 0) {
      return NextResponse.json({ error: 'Seat conflict detected', conflicts }, { status: 409 })
    }

    const totalAmount = (basketItems as any[]).reduce((sum, item) => sum + Number(item.price || 0), 0)

    if (totalAmount <= 0) {
      const booking = await prisma.booking.create({
        data: {
          userId,
          status: 'CONFIRMED',
          totalAmount,
          items: {
            create: (basketItems as any[]).map((item) => ({
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
              paidAt: new Date(),
            },
          },
        },
        include: { items: true, payment: true },
      })

      await prisma.basketItem.deleteMany({ where: { userId } })

      return NextResponse.json({
        success: true,
        bookingId: booking.id,
        totalAmount,
        message: 'Booking confirmed. No payment was required.',
      })
    }

    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json({
        error: 'Stripe is not configured. Please set STRIPE_SECRET_KEY before accepting paid bookings.',
      }, { status: 503 })
    }

    const booking = await prisma.booking.create({
      data: {
        userId,
        status: 'PENDING',
        totalAmount,
        items: {
          create: (basketItems as any[]).map((item) => ({
            scheduleId: item.scheduleId,
            pupilId: item.pupilId,
            seatNumber: item.seatNumber,
            direction: item.direction,
            tripDate: item.tripDate,
            price: item.price,
            status: 'PENDING',
          })),
        },
        payment: {
          create: {
            amount: totalAmount,
            currency: 'GBP',
            status: 'PENDING',
          },
        },
      },
      include: { items: true, payment: true },
    })

    const appUrl = getAppUrl(req)
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: booking.id,
      customer_email: session.user.email || undefined,
      success_url: `${appUrl}/parent/bookings?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/api/stripe/cancel?bookingId=${booking.id}`,
      metadata: {
        bookingId: booking.id,
        userId,
      },
      payment_intent_data: {
        metadata: {
          bookingId: booking.id,
          userId,
        },
      },
      line_items: (basketItems as any[]).map((item) => ({
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: toStripeAmount(Number(item.price || 0)),
          product_data: {
            name: `${item.pupil?.fullName || 'Pupil'} - ${item.schedule?.routeName || 'Transport seat'}`,
            description: [
              `Seat ${item.seatNumber}`,
              new Date(item.tripDate).toLocaleDateString('en-GB'),
              item.direction === 'HOME_TO_SCHOOL' ? 'Home to school' : 'School to home',
              item.schedule?.school?.name,
            ].filter(Boolean).join(' · '),
          },
        },
      })),
    })

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: { stripeSessionId: checkoutSession.id },
      }),
      prisma.payment.update({
        where: { bookingId: booking.id },
        data: { stripeSessionId: checkoutSession.id },
      }),
      prisma.basketItem.deleteMany({ where: { userId } }),
    ])

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      sessionId: checkoutSession.id,
      checkoutUrl: checkoutSession.url,
      totalAmount,
      message: 'Stripe checkout session created. Redirecting to secure payment.',
    })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 })
  }
}
