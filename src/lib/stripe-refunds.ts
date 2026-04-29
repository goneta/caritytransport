import { getStripeClient } from '@/lib/stripe'

type RefundablePayment = {
  stripePaymentId?: string | null
  stripeSessionId?: string | null
  amount: number
  status: string
}

export async function processStripeRefund(options: {
  bookingId: string
  payment?: RefundablePayment | null
  reason?: string | null
}) {
  const { bookingId, payment, reason } = options

  if (!payment) {
    return { refundId: null, skipped: true, message: 'No payment record exists for this booking.' }
  }

  if (payment.status === 'REFUNDED') {
    return { refundId: null, skipped: true, message: 'Payment was already marked as refunded.' }
  }

  if (!payment.stripePaymentId) {
    return {
      refundId: null,
      skipped: true,
      message: 'No Stripe payment intent is stored for this booking; marked as refunded locally for legacy or free bookings.',
    }
  }

  const stripe = getStripeClient()
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY before processing refunds.')
  }

  const refund = await stripe.refunds.create({
    payment_intent: payment.stripePaymentId,
    reason: 'requested_by_customer',
    metadata: {
      bookingId,
      refundReason: reason || 'Booking cancellation',
    },
  })

  return {
    refundId: refund.id,
    skipped: false,
    message: 'Stripe refund created successfully.',
  }
}
