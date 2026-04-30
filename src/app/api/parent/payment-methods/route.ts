
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAppUrl, getStripeClient } from '@/lib/stripe'

async function requireParentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })
  if (!user || user.role !== 'PARENT') return null
  return user
}

export async function GET() {
  try {
    const user = await requireParentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [paymentMethods, recurringPlans] = await Promise.all([
      prisma.savedPaymentMethod.findMany({
        where: { userId: user.id, status: 'ACTIVE' },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.recurringTransportPlan.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: {
          pupil: { select: { fullName: true } },
          schedule: { select: { routeName: true, departureTime: true, school: { select: { name: true } } } },
          savedPaymentMethod: true,
        },
      }),
    ])

    return NextResponse.json({ paymentMethods, recurringPlans })
  } catch (error) {
    console.error('GET /api/parent/payment-methods error', error)
    return NextResponse.json({ error: 'Failed to load payment methods' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireParentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const stripe = getStripeClient()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe is not configured for saved payment setup' }, { status: 503 })
    }

    let stripeCustomerId = (await prisma.savedPaymentMethod.findFirst({ where: { userId: user.id, stripeCustomerId: { not: null } } }))?.stripeCustomerId || null
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: user.email, name: user.name || undefined, metadata: { userId: user.id } })
      stripeCustomerId = customer.id
    }

    const appUrl = getAppUrl(req)
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      success_url: `${appUrl}/parent/payments?setup=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/parent/payments?setup=cancelled`,
      metadata: { userId: user.id, purpose: 'saved_payment_method' },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('POST /api/parent/payment-methods error', error)
    return NextResponse.json({ error: 'Failed to start saved payment setup' }, { status: 500 })
  }
}
