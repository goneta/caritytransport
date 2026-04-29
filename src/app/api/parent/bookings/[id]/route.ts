import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { processStripeRefund } from '@/lib/stripe-refunds'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const booking = await prisma.booking.findFirst({
      where: { id, userId: session.user.id },
      include: {
        items: {
          include: {
            schedule: {
              include: {
                school: { select: { name: true } },
                vehicle: { select: { regPlate: true, type: true, model: true, make: true, seats: true } },
                driver: { include: { user: { select: { name: true } } } },
              },
            },
            pupil: { select: { fullName: true, studentNumber: true, yearLevel: true } },
          },
        },
        payment: true,
      },
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json(booking)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const booking = await prisma.booking.findFirst({
      where: { id, userId: session.user.id },
      include: { items: true, payment: true },
    })

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    if (!['CONFIRMED', 'PENDING'].includes(booking.status)) {
      return NextResponse.json({ error: 'Booking cannot be cancelled' }, { status: 400 })
    }

    if (data.action === 'cancel') {
      // Check refund eligibility: >5 hours before departure
      const firstItem = booking.items[0]
      const hoursUntil = firstItem
        ? (new Date(firstItem.tripDate).getTime() - Date.now()) / (1000 * 60 * 60)
        : 999

      const refundable = hoursUntil > 5

      if (!data.reason) {
        return NextResponse.json({ error: 'Cancellation reason is required' }, { status: 400 })
      }

      let stripeRefundId: string | null = null

      if (refundable && booking.payment) {
        const refund = await processStripeRefund({
          bookingId: id,
          payment: booking.payment,
          reason: data.reason,
        })
        stripeRefundId = refund.refundId
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: refundable ? 'REFUNDED' : 'CANCELLED',
          cancelReason: data.reason,
          cancelledAt: new Date(),
          refundable,
          ...(refundable && { refundedAt: new Date(), refundId: stripeRefundId }),
        },
      })

      // Cancel all booking items
      await prisma.bookingItem.updateMany({
        where: { bookingId: id },
        data: { status: 'CANCELLED' },
      })

      // Update payment if refundable after Stripe/local refund processing completes
      if (refundable && booking.payment) {
        await prisma.payment.update({
          where: { bookingId: id },
          data: { status: 'REFUNDED' },
        })
      }

      return NextResponse.json({
        ...updated,
        refundable,
        message: refundable
          ? 'Booking cancelled. Full refund will be processed within 3-5 business days.'
          : 'Booking cancelled. No refund as cancellation is within 5 hours of departure.',
      })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 })
  }
}
