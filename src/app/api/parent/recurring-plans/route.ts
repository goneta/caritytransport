
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireParentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  const parent = await prisma.parent.findUnique({ where: { userId: session.user.id } })
  if (!parent) return null
  return { userId: session.user.id, parentId: parent.id }
}

function nextMonthlyRenewal(from = new Date()) {
  const date = new Date(from)
  date.setMonth(date.getMonth() + 1)
  return date
}

export async function POST(req: NextRequest) {
  try {
    const identity = await requireParentUser()
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { pupilId, scheduleId, savedPaymentMethodId, amount, renewalInterval = 'MONTHLY' } = await req.json()
    if (!pupilId || !scheduleId) {
      return NextResponse.json({ error: 'Pupil and route are required for automatic renewal' }, { status: 400 })
    }

    const pupil = await prisma.pupil.findFirst({ where: { id: pupilId, parentId: identity.parentId } })
    if (!pupil) return NextResponse.json({ error: 'Pupil not found' }, { status: 404 })

    const schedule = await prisma.transportSchedule.findUnique({ where: { id: scheduleId } })
    if (!schedule) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    const method = savedPaymentMethodId
      ? await prisma.savedPaymentMethod.findFirst({ where: { id: savedPaymentMethodId, userId: identity.userId, status: 'ACTIVE' } })
      : await prisma.savedPaymentMethod.findFirst({ where: { userId: identity.userId, isDefault: true, status: 'ACTIVE' } })

    const plan = await prisma.recurringTransportPlan.create({
      data: {
        userId: identity.userId,
        pupilId,
        scheduleId,
        savedPaymentMethodId: method?.id || null,
        stripeCustomerId: method?.stripeCustomerId || null,
        status: method ? 'ACTIVE' : 'PENDING_PAYMENT_METHOD',
        renewalInterval,
        nextRenewalDate: nextMonthlyRenewal(),
        amount: Number(amount ?? schedule.pricePerSeat ?? 0),
      },
      include: {
        pupil: { select: { fullName: true } },
        schedule: { select: { routeName: true, departureTime: true } },
        savedPaymentMethod: true,
      },
    })

    return NextResponse.json(plan, { status: 201 })
  } catch (error) {
    console.error('POST /api/parent/recurring-plans error', error)
    return NextResponse.json({ error: 'Failed to create automatic renewal plan' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const identity = await requireParentUser()
    if (!identity) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, status } = await req.json()
    if (!id || !['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Valid plan id and status are required' }, { status: 400 })
    }

    const plan = await prisma.recurringTransportPlan.updateMany({
      where: { id, userId: identity.userId },
      data: { status },
    })
    if (plan.count === 0) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH /api/parent/recurring-plans error', error)
    return NextResponse.json({ error: 'Failed to update renewal plan' }, { status: 500 })
  }
}
