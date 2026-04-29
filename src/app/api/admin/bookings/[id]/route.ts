import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { processStripeRefund } from '@/lib/stripe-refunds'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: {
          include: {
            schedule: {
              include: {
                school: { select: { name: true } },
                vehicle: { select: { regPlate: true, type: true, model: true, seats: true } },
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
    const data = await req.json()
    const booking = await prisma.booking.findUnique({ where: { id }, include: { items: true, payment: true } })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    if (data.action === 'cancel') {
      const departureCheck = booking.items[0]
      const hoursUntil = departureCheck
        ? (new Date(departureCheck.tripDate).getTime() - Date.now()) / (1000 * 60 * 60)
        : 999

      const refundable = hoursUntil > 5

      let stripeRefundId: string | null = null

      if (refundable && booking.payment) {
        const refund = await processStripeRefund({
          bookingId: id,
          payment: booking.payment,
          reason: data.reason || 'Admin cancellation',
        })
        stripeRefundId = refund.refundId
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: refundable ? 'REFUNDED' : 'CANCELLED',
          cancelReason: data.reason || null,
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

      if (refundable && booking.payment) {
        await prisma.payment.update({
          where: { bookingId: id },
          data: { status: 'REFUNDED' },
        })
      }

      return NextResponse.json({ ...updated, refundable })
    }

    // Admin override refund
    if (data.action === 'refund') {
      let stripeRefundId: string | null = null

      if (booking.payment) {
        const refund = await processStripeRefund({
          bookingId: id,
          payment: booking.payment,
          reason: data.reason || 'Admin override refund',
        })
        stripeRefundId = refund.refundId
      }

      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: 'REFUNDED',
          refundedAt: new Date(),
          refundable: true,
          refundId: stripeRefundId,
          cancelReason: data.reason || 'Admin override refund',
        },
      })
      if (booking.payment) {
        await prisma.payment.update({
          where: { bookingId: id },
          data: { status: 'REFUNDED' },
        })
      }
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
  }
}
