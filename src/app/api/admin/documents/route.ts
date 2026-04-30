import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const docType = searchParams.get('docType')
    const entityType = searchParams.get('entityType')
    const entityId = searchParams.get('entityId')

    const where: Record<string, unknown> = {}
    if (docType) where.docType = docType
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId

    const documents = await prisma.document.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Fetch documents error:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileName, fileData, docType, entityType, entityId, expiryDate } = await req.json()

    if (!fileName || !fileData || !docType) {
      return NextResponse.json({ error: 'fileName, fileData, and docType are required' }, { status: 400 })
    }

    // Validate file is a data URL
    if (!fileData.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid file format. Must be a data URL.' }, { status: 400 })
    }

    // Check mime type
    const mimeMatch = fileData.match(/^data:([\w/+.-]+);base64,/)
    if (!mimeMatch || !ALLOWED_TYPES.includes(mimeMatch[1])) {
      return NextResponse.json({ error: 'Only PDF, JPEG, PNG, and WebP files are allowed.' }, { status: 400 })
    }

    // Check file size
    const base64Data = fileData.split(',')[1]
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4)
    if (sizeBytes > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB.' }, { status: 400 })
    }

    const document = await prisma.document.create({
      data: {
        fileName,
        fileUrl: fileData,
        docType,
        entityType: entityType || 'GENERAL',
        entityId: entityId || session.user.id,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedBy: session.user.id,
      },
    })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'CREATE',
      entity: 'Document',
      entityId: document.id,
      before: null,
      after: { ...document, fileUrl: '[REDACTED]' },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Upload document error:', error)
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 })
    }

    const doc = await prisma.document.findUnique({ where: { id } })
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.document.delete({ where: { id } })

    await writeAdminAuditLogForRequest({
      request: req,
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
      before: { ...doc, fileUrl: '[REDACTED]' },
      after: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}
