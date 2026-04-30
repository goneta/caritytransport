import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import { validateIncidentAttachment } from '@/lib/incident-utils'

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

function redactAttachment<T extends { fileUrl: string }>(attachment: T) {
  return { ...attachment, fileUrl: '[REDACTED]' }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const incident = await prisma.incidentReport.findUnique({ where: { id }, select: { id: true, reference: true } })
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })

    const { fileName, fileData, caption } = await req.json()
    if (!fileName || !fileData) {
      return NextResponse.json({ error: 'fileName and fileData are required' }, { status: 400 })
    }

    const validation = validateIncidentAttachment(fileData)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const attachment = await prisma.incidentAttachment.create({
      data: {
        incidentId: incident.id,
        fileName: String(fileName),
        fileType: validation.mimeType,
        fileUrl: fileData,
        caption: caption ? String(caption) : null,
        uploadedById: context.userId,
      },
    })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'CREATE',
      entity: 'IncidentAttachment',
      entityId: attachment.id,
      before: null,
      after: redactAttachment(attachment),
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Incident attachment upload error:', error)
    return NextResponse.json({ error: 'Failed to upload attachment' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const context = await requireAdmin()
    if (context.error) return context.error

    const { searchParams } = new URL(req.url)
    const attachmentId = searchParams.get('attachmentId') || searchParams.get('id')
    if (!attachmentId) {
      return NextResponse.json({ error: 'attachmentId is required' }, { status: 400 })
    }

    const attachment = await prisma.incidentAttachment.findUnique({ where: { id: attachmentId } })
    if (!attachment || attachment.incidentId !== id) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    await prisma.incidentAttachment.delete({ where: { id: attachmentId } })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'DELETE',
      entity: 'IncidentAttachment',
      entityId: attachmentId,
      before: redactAttachment(attachment),
      after: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Incident attachment delete error:', error)
    return NextResponse.json({ error: 'Failed to delete attachment' }, { status: 500 })
  }
}
