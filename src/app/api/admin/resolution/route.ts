import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import { dispatchNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const tickets = await prisma.supportTicket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(type ? { ticketType: type } : {})
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        booking: {
          include: {
            items: {
              include: {
                schedule: { select: { routeName: true } },
                pupil: { select: { fullName: true } }
              }
            }
          }
        },
        replies: {
          include: {
            user: { select: { name: true, role: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Admin get tickets error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status, adminNotes, refundAmount, message } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: { user: true, booking: true }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) updateData.status = status
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes
    if (status === 'RESOLVED' || status === 'REJECTED') {
      updateData.resolvedAt = new Date()
    }

    // Handle refund if applicable
    if (status === 'RESOLVED' && refundAmount && ticket.bookingId) {
      updateData.refundProcessed = true
      updateData.refundAmount = refundAmount
    }

    const before = await prisma.supportTicket.findUnique({ where: { id }, include: { replies: true } })

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: updateData
    })

    // Add admin reply if message provided
    if (message) {
      await prisma.ticketReply.create({
        data: {
          ticketId: id,
          userId: session.user.id,
          message,
          isAdmin: true
        }
      })
    }

    // Notify the parent
    const statusMessages: Record<string, string> = {
      UNDER_REVIEW: `Your support ticket ${ticket.ticketNumber} is now under review. We will get back to you shortly.`,
      RESOLVED: `Your support ticket ${ticket.ticketNumber} has been resolved. ${refundAmount ? `A refund of £${refundAmount} has been processed.` : ''} ${adminNotes || ''}`,
      REJECTED: `Your support ticket ${ticket.ticketNumber} has been rejected. ${adminNotes || 'Please contact support for more information.'}`
    }

    if (status && statusMessages[status]) {
      await dispatchNotification({
        recipientId: ticket.userId,
        type: 'TICKET_UPDATE',
        subject: `Ticket Update: ${ticket.ticketNumber}`,
        message: statusMessages[status],
        triggerEvent: 'SUPPORT_TICKET_UPDATED',
      })
    }

    await writeAdminAuditLogForRequest({ request: req, action: 'UPDATE', entity: 'SupportTicket', entityId: id, before, after: updated })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin update ticket error:', error)
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
  }
}
