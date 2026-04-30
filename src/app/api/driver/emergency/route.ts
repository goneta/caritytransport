import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { dispatchNotificationBulk } from '@/lib/notifications'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'SCHEDULER']

async function getSignedInDriver() {
  const session = await auth()
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const driver = await prisma.driver.findUnique({ where: { userId: session.user.id }, include: { user: true } })
  if (!driver) return { error: NextResponse.json({ error: 'Driver profile not found' }, { status: 404 }) }

  return { session, driver }
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : Number.NaN
}

export async function GET() {
  try {
    const authResult = await getSignedInDriver()
    if ('error' in authResult) return authResult.error

    const escalations = await prisma.emergencyEscalation.findMany({
      where: { driverId: authResult.driver.id },
      include: {
        schedule: { select: { id: true, routeName: true, direction: true, departureTime: true } },
        vehicle: { select: { regPlate: true, type: true, make: true, model: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    })

    return NextResponse.json({ escalations })
  } catch (error) {
    console.error('Driver emergency fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch emergency escalations' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await getSignedInDriver()
    if ('error' in authResult) return authResult.error

    const body = await req.json()
    const scheduleId = String(body.scheduleId || '')
    const latitude = toNullableNumber(body.latitude)
    const longitude = toNullableNumber(body.longitude)

    if (!scheduleId) return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return NextResponse.json({ error: 'Invalid latitude or longitude' }, { status: 400 })
    }

    const schedule = await prisma.transportSchedule.findFirst({
      where: { id: scheduleId, driverId: authResult.driver.id },
      include: {
        school: { select: { name: true, address: true, postcode: true } },
        vehicle: { select: { id: true, regPlate: true, type: true, make: true, model: true, colour: true, seats: true } },
        seatAssignments: {
          include: {
            pupil: {
              select: {
                id: true,
                fullName: true,
                yearLevel: true,
                pickupLocation: true,
                pickupPostcode: true,
                specialRequirements: true,
                emergencyContactName: true,
                emergencyContactPhone: true,
                parent: { include: { user: { select: { name: true, phone: true, email: true } } } },
                school: { select: { name: true } },
              },
            },
          },
        },
      },
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule is not assigned to this driver' }, { status: 403 })
    }

    const manifestPassengerCount = schedule.seatAssignments.length
    const submittedPassengerCount = body.passengerCount === null || body.passengerCount === undefined || body.passengerCount === ''
      ? manifestPassengerCount
      : Number(body.passengerCount)

    if (!Number.isInteger(submittedPassengerCount) || submittedPassengerCount < 0) {
      return NextResponse.json({ error: 'passengerCount must be a non-negative whole number' }, { status: 400 })
    }

    const passengerContext = schedule.seatAssignments.map((assignment) => ({
      pupilId: assignment.pupil.id,
      fullName: assignment.pupil.fullName,
      yearLevel: assignment.pupil.yearLevel,
      school: assignment.pupil.school?.name || schedule.school?.name || null,
      pickupLocation: assignment.pupil.pickupLocation,
      pickupPostcode: assignment.pupil.pickupPostcode,
      specialRequirements: assignment.pupil.specialRequirements,
      emergencyContactName: assignment.pupil.emergencyContactName,
      emergencyContactPhone: assignment.pupil.emergencyContactPhone,
      parentName: assignment.pupil.parent?.user?.name || null,
      parentPhone: assignment.pupil.parent?.user?.phone || null,
      parentEmail: assignment.pupil.parent?.user?.email || null,
    }))

    const routeContext = {
      route: {
        scheduleId: schedule.id,
        routeName: schedule.routeName,
        serviceType: schedule.serviceType,
        direction: schedule.direction,
        departureTime: schedule.departureTime,
        arrivalTime: schedule.arrivalTime,
        pickupPostcode: schedule.pickupPostcode,
        dropoffPostcode: schedule.dropoffPostcode,
        pickupStops: schedule.pickupStops,
        dropoffLocation: schedule.dropoffLocation,
        recurrence: schedule.recurrence,
      },
      school: schedule.school,
      vehicle: schedule.vehicle,
      driver: {
        driverId: authResult.driver.id,
        name: authResult.driver.user.name,
        phone: authResult.driver.user.phone,
        licenceNumber: authResult.driver.licenceNumber,
      },
      passengers: passengerContext,
      manifestPassengerCount,
      reportedPassengerCount: submittedPassengerCount,
      browserContext: body.routeContext && typeof body.routeContext === 'object' ? body.routeContext : null,
    }

    const escalation = await prisma.emergencyEscalation.create({
      data: {
        driverId: authResult.driver.id,
        scheduleId,
        vehicleId: schedule.vehicleId || null,
        latitude,
        longitude,
        passengerCount: submittedPassengerCount,
        routeContext: routeContext as Prisma.InputJsonValue,
        status: 'ACTIVE',
        notes: body.notes ? String(body.notes).slice(0, 1000) : null,
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
        status: 'EMERGENCY_ESCALATED',
        latitude,
        longitude,
        notes: `Emergency escalation raised for ${schedule.routeName}. Vehicle: ${schedule.vehicle?.regPlate || 'not assigned'}. Passenger count: ${submittedPassengerCount}/${manifestPassengerCount}.${body.notes ? ` Notes: ${String(body.notes).slice(0, 250)}` : ''}`.slice(0, 500),
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES }, status: 'ACTIVE' },
      select: { id: true },
    })
    const adminIds = admins.map((admin) => admin.id)

    if (adminIds.length) {
      const mapsLink = latitude !== null && longitude !== null
        ? ` Location: https://maps.google.com/?q=${latitude},${longitude}.`
        : ' Location: GPS unavailable from the driver browser.'

      await dispatchNotificationBulk(adminIds, {
        type: 'EMERGENCY_ALERT',
        subject: `EMERGENCY: ${schedule.routeName}`,
        message: `${authResult.driver.user.name || 'A driver'} raised an emergency escalation for ${schedule.routeName}. Vehicle: ${schedule.vehicle?.regPlate || 'not assigned'}. Route direction: ${schedule.direction.replace(/_/g, ' ')}. Passengers reported: ${submittedPassengerCount}/${manifestPassengerCount}.${mapsLink}`,
        triggerEvent: 'DRIVER_EMERGENCY_ESCALATION',
        senderId: authResult.driver.userId,
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: authResult.driver.userId,
        action: 'EMERGENCY_ESCALATION_CREATED',
        entity: 'EmergencyEscalation',
        entityId: escalation.id,
        after: JSON.stringify({ scheduleId, latitude, longitude, passengerCount: submittedPassengerCount, notifiedAdmins: adminIds.length }),
      },
    })

    return NextResponse.json({ success: true, escalation, notifiedAdmins: adminIds.length })
  } catch (error) {
    console.error('Driver emergency submit error:', error)
    return NextResponse.json({ error: 'Failed to raise emergency escalation' }, { status: 500 })
  }
}
