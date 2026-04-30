import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        parent: {
          include: {
            pupils: {
              include: {
                school: true,
                seatAssignments: { include: { schedule: true } },
              },
            },
          },
        },
      },
    })
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch parent' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const data = await req.json()
    const { name, email, phone, address, status, notifySMS, notifyEmail } = data

    const before = await prisma.user.findUnique({ where: { id } })

    const user = await prisma.user.update({
      where: { id },
      data: { name, email, phone, address, status, notifySMS, notifyEmail },
    })

    await writeAdminAuditLogForRequest({ request: req, action: 'UPDATE', entity: 'Parent', entityId: id, before, after: user })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update parent' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const before = await prisma.user.findUnique({ where: { id } })
    await prisma.user.delete({ where: { id } })
    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'Parent', entityId: id, before, after: null })
    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete parent' }, { status: 500 })
  }
}
