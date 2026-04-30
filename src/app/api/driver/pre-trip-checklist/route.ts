import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { dispatchNotificationBulk } from '@/lib/notifications'

const REQUIRED_CHECKS = ['fuel', 'tyres', 'lights', 'mirrors', 'firstAid'] as const
const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SCHEDULER']

function startOfToday() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function normaliseChecklistItems(raw: unknown) {
  const source = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}

  return {
    fuel: Boolean(source.fuel),
    tyres: Boolean(source.tyres),
    lights: Boolean(source.lights),
    mirrors: Boolean(source.mirrors),
    firstAid: Boolean(source.firstAid),
    passengerManifest: Boolean(source.passengerManifest),
    endOfTripCompletion: Boolean(source.endOfTripCompletion),
  }
}

async function getSignedInDriver() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id }, include: { user: true } })
  if (!driver) return { error: NextResponse.json({ error: 'Driver profile not found' }, { status: 404 }) }

  return { session, driver }
}

export async function GET(req: NextRequest) {
  try {
    const authResult = await getSignedInDriver()
    if ('error' in authResult) return authResult.error

    const { searchParams } = new URL(req.url)
    const scheduleId = searchParams.get('scheduleId')
    const today = startOfToday()

    if (scheduleId) {
      const schedule = await prisma.transportSchedule.findFirst({
        where: { id: scheduleId, driverId: authResult.driver.id },
        select: { id: true },
      })

      if (!schedule) {
        return NextResponse.json({ error: 'Schedule is not assigned to this driver' }, { status: 403 })
      }
    }

    const checklists = await prisma.preTripChecklist.findMany({
      where: {
        driverId: authResult.driver.id,
        ...(scheduleId ? { scheduleId } : {}),
        createdAt: { gte: today },
      },
      include: {
        schedule: { select: { id: true, routeName: true, direction: true, departureTime: true } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ checklists })
  } catch (error) {
    console.error('Driver pre-trip checklist fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch pre-trip checklists' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await getSignedInDriver()
    if ('error' in authResult) return authResult.error

    const body = await req.json()
    const scheduleId = String(body.scheduleId || '')
    const passengerCount = Number(body.passengerCount)
    const checklistItems = normaliseChecklistItems(body.checklistItems)
    const endOfTripCompleted = Boolean(body.endOfTripCompleted ?? checklistItems.endOfTripCompletion)
    const notes = body.notes ? String(body.notes).slice(0, 800) : null

    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
    if (!Number.isInteger(passengerCount) || passengerCount < 0) {
      return NextResponse.json({ error: 'passengerCount must be a non-negative whole number' }, { status: 400 })
    }

    const schedule = await prisma.transportSchedule.findFirst({
      where: { id: scheduleId, driverId: authResult.driver.id },
      include: {
        vehicle: true,
        school: { select: { name: true } },
        seatAssignments: { select: { id: true } },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule is not assigned to this driver' }, { status: 403 })
    }

    const requiredChecksComplete = REQUIRED_CHECKS.every((key) => checklistItems[key])
    const status = requiredChecksComplete ? 'COMPLETED' : 'PENDING'
    const expectedPassengerCount = schedule.seatAssignments.length
    const countMismatch = passengerCount !== expectedPassengerCount
    const completedAt = status === 'COMPLETED' ? new Date() : null

    const checklist = await prisma.preTripChecklist.create({
      data: {
        driverId: authResult.driver.id,
        scheduleId,
        vehicleId: schedule.vehicleId || null,
        checklistItems: {
          ...checklistItems,
          expectedPassengerCount,
          countMismatch,
        } as Prisma.InputJsonValue,
        passengerCount,
        endOfTripCompleted,
        status,
        completedAt,
        notes,
      },
      include: {
        schedule: { select: { id: true, routeName: true, direction: true, departureTime: true } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
      },
    })

    await prisma.tripLog.create({
      data: {
        scheduleId,
        driverId: authResult.driver.id,
        vehicleId: schedule.vehicleId || undefined,
        status: status === 'COMPLETED' ? 'PRE_TRIP_CHECK_COMPLETED' : 'PRE_TRIP_CHECK_PENDING',
        notes: `Pre-trip checklist ${status.toLowerCase()}. Passenger count: ${passengerCount}/${expectedPassengerCount}.${endOfTripCompleted ? ' End-of-trip completion confirmed.' : ''}${notes ? ` Notes: ${notes}` : ''}`.slice(0, 500),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: authResult.driver.userId,
        action: 'PRE_TRIP_CHECKLIST_SUBMITTED',
        entity: 'PreTripChecklist',
        entityId: checklist.id,
        after: JSON.stringify({ scheduleId, status, passengerCount, expectedPassengerCount, countMismatch }),
      },
    })

    let notifiedAdmins = 0
    if (status === 'PENDING' || countMismatch) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ADMIN_ROLES }, status: 'ACTIVE' },
        select: { id: true },
      })
      const adminIds = admins.map((admin) => admin.id)
      notifiedAdmins = adminIds.length

      if (adminIds.length) {
        await dispatchNotificationBulk(adminIds, {
          type: 'SAFETY_CHECK_ALERT',
          subject: `Driver checklist attention needed: ${schedule.routeName}`,
          message: `${authResult.driver.user.name || 'A driver'} submitted a ${status.toLowerCase()} pre-trip checklist for ${schedule.routeName}. Vehicle: ${schedule.vehicle?.regPlate || 'not assigned'}. Passenger count: ${passengerCount}/${expectedPassengerCount}.${countMismatch ? ' Passenger count differs from manifest.' : ''}`,
          triggerEvent: 'PRE_TRIP_CHECKLIST_ALERT',
          senderId: authResult.driver.userId,
        })
      }
    }

    return NextResponse.json({ success: true, checklist, notifiedAdmins })
  } catch (error) {
    console.error('Driver pre-trip checklist submit error:', error)
    return NextResponse.json({ error: 'Failed to submit pre-trip checklist' }, { status: 500 })
  }
}
