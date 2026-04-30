import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { notifyParentsForIncident } from '@/lib/incident-notifications'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import {
  generateIncidentReference,
  isIncidentSeverity,
  isIncidentType,
  validateIncidentAttachment,
} from '@/lib/incident-utils'

async function getSignedInDriver() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: session.user.id },
    include: { user: { select: { id: true, name: true, email: true } } },
  })

  if (!driver) {
    return { error: NextResponse.json({ error: 'Driver profile not found' }, { status: 404 }) }
  }

  return { session, driver, userId: session.user.id }
}

async function uniqueIncidentReference(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateIncidentReference()
    const existing = await prisma.incidentReport.findUnique({ where: { reference } })
    if (!existing) return reference
  }
  return `INC-${Date.now().toString(36).toUpperCase()}`
}

export async function GET(req: NextRequest) {
  try {
    const context = await getSignedInDriver()
    if (context.error) return context.error

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || '20')))
    const skip = (page - 1) * limit

    const where = {
      driverId: context.driver.id,
      ...(status ? { status } : {}),
    }

    const [incidents, total] = await Promise.all([
      prisma.incidentReport.findMany({
        where,
        include: {
          schedule: { select: { id: true, routeName: true, direction: true } },
          tripLog: { select: { id: true, status: true, timestamp: true } },
          pupil: { select: { id: true, fullName: true, studentNumber: true } },
          vehicle: { select: { id: true, regPlate: true, make: true, model: true } },
          attachments: { select: { id: true, fileName: true, fileType: true, caption: true, createdAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.incidentReport.count({ where }),
    ])

    return NextResponse.json({ incidents, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Driver incidents GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await getSignedInDriver()
    if (context.error) return context.error

    const body = await req.json()
    const {
      incidentType,
      severity = 'MEDIUM',
      title,
      description,
      tripLogId,
      scheduleId,
      pupilId,
      vehicleId,
      parentVisible = true,
      attachment,
    } = body

    if (!isIncidentType(incidentType)) {
      return NextResponse.json({ error: 'A valid incidentType is required' }, { status: 400 })
    }

    if (!isIncidentSeverity(severity)) {
      return NextResponse.json({ error: 'A valid severity is required' }, { status: 400 })
    }

    if (!title || !description) {
      return NextResponse.json({ error: 'title and description are required' }, { status: 400 })
    }

    let resolvedScheduleId: string | undefined = scheduleId || undefined
    let resolvedPupilId: string | undefined = pupilId || undefined
    let resolvedVehicleId: string | undefined = vehicleId || undefined

    if (tripLogId) {
      const tripLog = await prisma.tripLog.findUnique({ where: { id: tripLogId } })
      if (!tripLog || tripLog.driverId !== context.driver.id) {
        return NextResponse.json({ error: 'Trip log not found for this driver' }, { status: 404 })
      }
      resolvedScheduleId = resolvedScheduleId || tripLog.scheduleId
      resolvedPupilId = resolvedPupilId || tripLog.pupilId || undefined
      resolvedVehicleId = resolvedVehicleId || tripLog.vehicleId || undefined
    }

    if (resolvedScheduleId) {
      const schedule = await prisma.transportSchedule.findUnique({
        where: { id: resolvedScheduleId },
        select: { id: true, driverId: true, vehicleId: true },
      })
      if (!schedule || schedule.driverId !== context.driver.id) {
        return NextResponse.json({ error: 'Schedule not found for this driver' }, { status: 404 })
      }
      resolvedVehicleId = resolvedVehicleId || schedule.vehicleId || undefined
    }

    if (resolvedPupilId && resolvedScheduleId) {
      const assigned = await prisma.seatAssignment.findFirst({
        where: { scheduleId: resolvedScheduleId, pupilId: resolvedPupilId, status: 'ASSIGNED' },
      })
      if (!assigned) {
        return NextResponse.json({ error: 'Pupil is not assigned to the selected schedule' }, { status: 400 })
      }
    }

    const incident = await prisma.incidentReport.create({
      data: {
        reference: await uniqueIncidentReference(),
        incidentType,
        severity,
        title: String(title).trim(),
        description: String(description).trim(),
        parentVisible: Boolean(parentVisible),
        tripLogId: tripLogId || null,
        scheduleId: resolvedScheduleId || null,
        pupilId: resolvedPupilId || null,
        driverId: context.driver.id,
        vehicleId: resolvedVehicleId || null,
        createdById: context.userId,
      },
    })

    if (attachment?.fileData && attachment?.fileName) {
      const validation = validateIncidentAttachment(attachment.fileData)
      if (!validation.ok) {
        await prisma.incidentReport.delete({ where: { id: incident.id } })
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      await prisma.incidentAttachment.create({
        data: {
          incidentId: incident.id,
          fileName: String(attachment.fileName),
          fileType: validation.mimeType,
          fileUrl: attachment.fileData,
          caption: attachment.caption ? String(attachment.caption) : null,
          uploadedById: context.userId,
        },
      })
    }

    let notificationResult: Awaited<ReturnType<typeof notifyParentsForIncident>> | undefined
    if (incident.parentVisible && ['HIGH', 'CRITICAL'].includes(incident.severity)) {
      notificationResult = await notifyParentsForIncident({
        incidentId: incident.id,
        senderId: context.userId,
        event: 'created',
      })
    }

    const created = await prisma.incidentReport.findUnique({
      where: { id: incident.id },
      include: {
        schedule: { select: { id: true, routeName: true, direction: true } },
        tripLog: { select: { id: true, status: true, timestamp: true } },
        pupil: { select: { id: true, fullName: true, studentNumber: true } },
        vehicle: { select: { id: true, regPlate: true, make: true, model: true } },
        attachments: { select: { id: true, fileName: true, fileType: true, caption: true, createdAt: true } },
      },
    })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'CREATE',
      entity: 'IncidentReport',
      entityId: incident.id,
      before: null,
      after: created,
    })

    return NextResponse.json({ incident: created, notification: notificationResult }, { status: 201 })
  } catch (error) {
    console.error('Driver incident creation error:', error)
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
  }
}
