import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import { notifyParentsForIncident } from '@/lib/incident-notifications'
import { isIncidentSeverity, isIncidentStatus, isIncidentType } from '@/lib/incident-utils'

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

const incidentDetailInclude = {
  createdBy: { select: { id: true, name: true, email: true, role: true } },
  driver: { include: { user: { select: { name: true, email: true, phone: true } }, company: { select: { name: true } } } },
  schedule: {
    include: {
      school: { select: { name: true, address: true } },
      vehicle: { select: { id: true, regPlate: true, make: true, model: true, type: true } },
    },
  },
  tripLog: { select: { id: true, status: true, timestamp: true, notes: true, latitude: true, longitude: true } },
  pupil: { include: { parent: { include: { user: { select: { name: true, email: true, phone: true } } } }, school: { select: { name: true } } } },
  vehicle: { select: { id: true, regPlate: true, make: true, model: true, type: true, status: true } },
  attachments: { orderBy: { createdAt: 'desc' } },
} satisfies Prisma.IncidentReportInclude

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const incident = await prisma.incidentReport.findUnique({ where: { id }, include: incidentDetailInclude })
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

    return NextResponse.json(incident)
  } catch (error) {
    console.error('Admin incident detail GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const body = await req.json()
    const before = await prisma.incidentReport.findUnique({ where: { id }, include: incidentDetailInclude })
    if (!before) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}

    if (body.incidentType !== undefined) {
      if (!isIncidentType(body.incidentType)) return NextResponse.json({ error: 'Invalid incidentType' }, { status: 400 })
      updateData.incidentType = body.incidentType
    }

    if (body.severity !== undefined) {
      if (!isIncidentSeverity(body.severity)) return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
      updateData.severity = body.severity
    }

    if (body.status !== undefined) {
      if (!isIncidentStatus(body.status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      updateData.status = body.status
      if (body.status === 'RESOLVED' || body.status === 'CLOSED') {
        updateData.resolvedAt = before.resolvedAt || new Date()
      }
      if (body.status === 'OPEN' || body.status === 'INVESTIGATING') {
        updateData.resolvedAt = null
      }
    }

    if (body.title !== undefined) updateData.title = String(body.title).trim()
    if (body.description !== undefined) updateData.description = String(body.description).trim()
    if (body.actionTaken !== undefined) updateData.actionTaken = body.actionTaken ? String(body.actionTaken).trim() : null
    if (body.parentVisible !== undefined) updateData.parentVisible = Boolean(body.parentVisible)
    if (body.parentNotificationSummary !== undefined) {
      updateData.parentNotificationSummary = body.parentNotificationSummary ? String(body.parentNotificationSummary).trim() : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No supported update fields supplied' }, { status: 400 })
    }

    await prisma.incidentReport.update({ where: { id }, data: updateData })

    let notificationResult: Awaited<ReturnType<typeof notifyParentsForIncident>> | undefined
    const statusChanged = body.status !== undefined && body.status !== before.status
    const becameVisible = body.parentVisible === true && !before.parentVisible
    const newlyNeedsInitialNotification = body.parentVisible !== false && !before.parentNotified && ['HIGH', 'CRITICAL'].includes(String(updateData.severity || before.severity))

    if ((statusChanged || becameVisible || newlyNeedsInitialNotification) && Boolean(updateData.parentVisible ?? before.parentVisible)) {
      notificationResult = await notifyParentsForIncident({
        incidentId: id,
        senderId: context.userId,
        event: statusChanged ? 'updated' : 'created',
      })
    }

    const after = await prisma.incidentReport.findUnique({ where: { id }, include: incidentDetailInclude })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'UPDATE',
      entity: 'IncidentReport',
      entityId: id,
      before,
      after,
    })

    return NextResponse.json({ incident: after, notification: notificationResult })
  } catch (error) {
    console.error('Admin incident update error:', error)
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const before = await prisma.incidentReport.findUnique({ where: { id }, include: incidentDetailInclude })
    if (!before) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

    await prisma.incidentReport.delete({ where: { id } })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'DELETE',
      entity: 'IncidentReport',
      entityId: id,
      before,
      after: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin incident delete error:', error)
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 })
  }
}
