import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import { dispatchNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const tickets = await prisma.supportTicket.findMany({
      where: {
        userId: session.user.id,
        ...(status ? { status } : {})
      },
      include: {
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
    console.error('Get tickets error:', error)
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId, ticketType, description } = await req.json()

    if (!ticketType || !description) {
      return NextResponse.json({ error: 'Ticket type and description are required' }, { status: 400 })
    }

    // Generate ticket number
    const ticketCount = await prisma.supportTicket.count()
    const ticketNumber = `TKT-${String(ticketCount + 1).padStart(5, '0')}`

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId: session.user.id,
        bookingId: bookingId || null,
        ticketType,
        description,
        status: 'OPEN'
      }
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    })

    const submitter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true }
    })

    for (const admin of admins) {
      await dispatchNotification({
        recipientId: admin.id,
        type: 'NEW_SUPPORT_TICKET',
        subject: `New Support Ticket: ${ticketNumber}`,
        message: `${submitter?.name || 'A parent'} has submitted a new ${ticketType} ticket. Description: ${description.slice(0, 100)}...`,
        triggerEvent: 'SUPPORT_TICKET_CREATED',
      })
    }

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Create ticket error:', error)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
