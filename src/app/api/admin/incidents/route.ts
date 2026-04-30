import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import { notifyParentsForIncident } from '@/lib/incident-notifications'
import {
  generateIncidentReference,
  isIncidentSeverity,
  isIncidentStatus,
  isIncidentType,
  validateIncidentAttachment,
} from '@/lib/incident-utils'

const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'])

async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const role = (session.user as { role?: string }).role
  if (!role || !ADMIN_ROLES.has(role)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { session, userId: session.user.id }
}

async function uniqueIncidentReference(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const reference = generateIncidentReference()
    const existing = await prisma.incidentReport.findUnique({ where: { reference } })
    if (!existing) return reference
  }
  return `INC-${Date.now().toString(36).toUpperCase()}`
}

const incidentInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  driver: { include: { user: { select: { name: true, email: true, phone: true } } } },
  schedule: { include: { school: { select: { name: true } }, vehicle: { select: { regPlate: true, make: true, model: true } } } },
  tripLog: { select: { id: true, status: true, timestamp: true, notes: true } },
  pupil: { include: { parent: { include: { user: { select: { name: true, email: true, phone: true } } } } } },
  vehicle: { select: { id: true, regPlate: true, make: true, model: true, type: true } },
  attachments: { select: { id: true, fileName: true, fileType: true, caption: true, createdAt: true, uploadedById: true } },
}

export async function GET(req: NextRequest) {
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const driverId = searchParams.get('driverId')
    const pupilId = searchParams.get('pupilId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (type) where.incidentType = type
    if (severity) where.severity = severity
    if (status) where.status = status
    if (driverId) where.driverId = driverId
    if (pupilId) where.pupilId = pupilId
    if (dateFrom || dateTo) {
      where.createdAt = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo) } : {}),
      }
    }

    const [incidents, total] = await Promise.all([
      prisma.incidentReport.findMany({
        where,
        include: incidentInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.incidentReport.count({ where }),
    ])

    return NextResponse.json({ incidents, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin incidents GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const body = await req.json()
    const {
      incidentType,
      severity = 'MEDIUM',
      title,
      description,
      actionTaken,
      tripLogId,
      scheduleId,
      pupilId,
      driverId,
      vehicleId,
      parentVisible = true,
      parentNotificationSummary,
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
    let resolvedDriverId: string | undefined = driverId || undefined
    let resolvedVehicleId: string | undefined = vehicleId || undefined

    if (tripLogId) {
      const tripLog = await prisma.tripLog.findUnique({ where: { id: tripLogId } })
      if (!tripLog) return NextResponse.json({ error: 'Trip log not found' }, { status: 404 })
      resolvedScheduleId = resolvedScheduleId || tripLog.scheduleId
      resolvedPupilId = resolvedPupilId || tripLog.pupilId || undefined
      resolvedDriverId = resolvedDriverId || tripLog.driverId || undefined
      resolvedVehicleId = resolvedVehicleId || tripLog.vehicleId || undefined
    }

    if (resolvedScheduleId) {
      const schedule = await prisma.transportSchedule.findUnique({
        where: { id: resolvedScheduleId },
        select: { driverId: true, vehicleId: true },
      })
      if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
      resolvedDriverId = resolvedDriverId || schedule.driverId || undefined
      resolvedVehicleId = resolvedVehicleId || schedule.vehicleId || undefined
    }

    if (resolvedPupilId) {
      const pupil = await prisma.pupil.findUnique({ where: { id: resolvedPupilId }, select: { id: true } })
      if (!pupil) return NextResponse.json({ error: 'Pupil not found' }, { status: 404 })
    }

    const incident = await prisma.incidentReport.create({
      data: {
        reference: await uniqueIncidentReference(),
        incidentType,
        severity,
        title: String(title).trim(),
        description: String(description).trim(),
        actionTaken: actionTaken ? String(actionTaken) : null,
        parentVisible: Boolean(parentVisible),
        parentNotificationSummary: parentNotificationSummary ? String(parentNotificationSummary) : null,
        tripLogId: tripLogId || null,
        scheduleId: resolvedScheduleId || null,
        pupilId: resolvedPupilId || null,
        driverId: resolvedDriverId || null,
        vehicleId: resolvedVehicleId || null,
        createdById: context.userId,
      },
    })

    let attachmentSnapshot: Record<string, unknown> | undefined
    if (attachment?.fileData && attachment?.fileName) {
      const validation = validateIncidentAttachment(attachment.fileData)
      if (!validation.ok) {
        await prisma.incidentReport.delete({ where: { id: incident.id } })
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }

      const createdAttachment = await prisma.incidentAttachment.create({
        data: {
          incidentId: incident.id,
          fileName: String(attachment.fileName),
          fileType: validation.mimeType,
          fileUrl: attachment.fileData,
          caption: attachment.caption ? String(attachment.caption) : null,
          uploadedById: context.userId,
        },
      })
      attachmentSnapshot = { ...createdAttachment, fileUrl: '[REDACTED]' }
    }

    let notificationResult: Awaited<ReturnType<typeof notifyParentsForIncident>> | undefined
    if (incident.parentVisible && ['HIGH', 'CRITICAL'].includes(incident.severity)) {
      notificationResult = await notifyParentsForIncident({
        incidentId: incident.id,
        senderId: context.userId,
        event: 'created',
      })
    }

    const created = await prisma.incidentReport.findUnique({ where: { id: incident.id }, include: incidentInclude })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'CREATE',
      entity: 'IncidentReport',
      entityId: incident.id,
      before: null,
      after: { ...created, attachment: attachmentSnapshot },
    })

    return NextResponse.json({ incident: created, notification: notificationResult }, { status: 201 })
  } catch (error) {
    console.error('Admin incident creation error:', error)
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 })
  }
}
