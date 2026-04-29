import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import prisma from '@/lib/prisma'
import { getStripeClient } from '@/lib/stripe'

async function confirmBookingFromSession(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.bookingId || session.client_reference_id || undefined
  if (!bookingId) return

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
        stripeSessionId: session.id,
        stripePaymentId: paymentIntentId || undefined,
      },
    }),
    prisma.bookingItem.updateMany({
      where: { bookingId },
      data: { status: 'ACTIVE' },
    }),
    prisma.payment.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: Number(session.amount_total || 0) / 100,
        currency: (session.currency || 'gbp').toUpperCase(),
        status: 'COMPLETED',
        stripeSessionId: session.id,
        stripePaymentId: paymentIntentId || undefined,
        paidAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        stripeSessionId: session.id,
        stripePaymentId: paymentIntentId || undefined,
        paidAt: new Date(),
      },
    }),
  ])
}

async function cancelPendingBooking(session: Stripe.Checkout.Session, status: 'CANCELLED' | 'PAYMENT_FAILED') {
  const bookingId = session.metadata?.bookingId || session.client_reference_id || undefined
  if (!bookingId) return

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { status: true } })
  if (!booking || booking.status !== 'PENDING') return

  await prisma.$transaction([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        cancelReason: status === 'PAYMENT_FAILED' ? 'Stripe payment failed' : 'Stripe checkout expired or was cancelled',
        cancelledAt: new Date(),
      },
    }),
    prisma.bookingItem.updateMany({
      where: { bookingId },
      data: { status: 'CANCELLED' },
    }),
    prisma.payment.updateMany({
      where: { bookingId },
      data: { status },
    }),
  ])
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient()
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  try {
    event = webhookSecret
      ? stripe.webhooks.constructEvent(body, signature || '', webhookSecret)
      : JSON.parse(body)
  } catch (error) {
    console.error('Stripe webhook signature verification failed:', error)
    return NextResponse.json({ error: 'Invalid Stripe webhook signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await confirmBookingFromSession(event.data.object as Stripe.Checkout.Session)
    }

    if (event.type === 'checkout.session.expired') {
      await cancelPendingBooking(event.data.object as Stripe.Checkout.Session, 'CANCELLED')
    }

    if (event.type === 'checkout.session.async_payment_failed') {
      await cancelPendingBooking(event.data.object as Stripe.Checkout.Session, 'PAYMENT_FAILED')
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Stripe webhook processing error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
