import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { optimizePickupOrder } from '@/lib/route-optimization'

async function loadScheduleForOptimization(id: string) {
  return prisma.transportSchedule.findUnique({
    where: { id },
    include: {
      school: true,
      seatAssignments: {
        where: { status: 'ASSIGNED' },
        include: {
          pupil: {
            select: {
              id: true,
              fullName: true,
              pickupLocation: true,
              pickupPostcode: true,
              specialRequirements: true,
            },
          },
        },
        orderBy: [{ seatNumber: 'asc' }, { assignedAt: 'asc' }],
      },
    },
  })
}

function buildSuggestion(schedule: NonNullable<Awaited<ReturnType<typeof loadScheduleForOptimization>>>) {
  return optimizePickupOrder(
    schedule.seatAssignments.map((assignment) => ({
      pupilId: assignment.pupil.id,
      pupilName: assignment.pupil.fullName,
      pickupLocation: assignment.pupil.pickupLocation,
      pickupPostcode: assignment.pupil.pickupPostcode,
      specialRequirements: assignment.pupil.specialRequirements,
    })),
    {
      routeName: schedule.routeName,
      direction: schedule.direction,
      departureTime: schedule.departureTime,
      schoolName: schedule.school?.name,
      schoolAddress: schedule.school?.address,
      schoolPostcode: schedule.school?.postcode,
      dropoffLocation: schedule.dropoffLocation,
      dropoffPostcode: schedule.dropoffPostcode,
      currentPickupPostcode: schedule.pickupPostcode,
    }
  )
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const schedule = await loadScheduleForOptimization(id)
    if (!schedule) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    const suggestion = buildSuggestion(schedule)
    return NextResponse.json({ suggestion, applied: false })
  } catch (error) {
    console.error('Route optimization suggestion error:', error)
    return NextResponse.json({ error: 'Failed to generate route optimization suggestion' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const apply = body?.apply === true

    const schedule = await loadScheduleForOptimization(id)
    if (!schedule) return NextResponse.json({ error: 'Route not found' }, { status: 404 })

    const suggestion = buildSuggestion(schedule)
    if (!apply) return NextResponse.json({ suggestion, applied: false })

    if (suggestion.stops.length === 0) {
      return NextResponse.json(
        { error: 'No assigned pupils with usable pickup information are available to optimize', suggestion },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.transportSchedule.update({
        where: { id },
        data: {
          pickupStops: JSON.stringify(suggestion.stops.map((stop) => ({
            pupilId: stop.pupilId,
            pupilName: stop.pupilName,
            address: stop.address,
            postcode: stop.postcode,
            estimatedTime: stop.estimatedTime,
            sequence: stop.sequence,
            reason: stop.reason,
            confidence: stop.confidence,
          }))),
        },
      }),
      prisma.auditLog.create({
        data: {
          userId,
          action: 'ROUTE_OPTIMIZATION_APPLIED',
          entity: 'TransportSchedule',
          entityId: id,
          before: schedule.pickupStops || null,
          after: JSON.stringify({ algorithm: suggestion.algorithm, stops: suggestion.stops }),
          userAgent: req.headers.get('user-agent') || null,
        },
      }),
    ])

    return NextResponse.json({ suggestion, applied: true })
  } catch (error) {
    console.error('Route optimization apply error:', error)
    return NextResponse.json({ error: 'Failed to apply route optimization suggestion' }, { status: 500 })
  }
}
