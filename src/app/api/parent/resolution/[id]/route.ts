import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: session.user.id },
      include: {
        booking: {
          include: {
            items: {
              include: {
                schedule: { select: { routeName: true, direction: true } },
                pupil: { select: { fullName: true } }
              }
            }
          }
        },
        replies: {
          include: {
            user: { select: { name: true, role: true, image: true } }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    console.error('Get ticket error:', error)
    return NextResponse.json({ error: 'Failed to fetch ticket' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { message } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify ticket belongs to this user
    const ticket = await prisma.supportTicket.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const reply = await prisma.ticketReply.create({
      data: {
        ticketId: id,
        userId: session.user.id,
        message,
        isAdmin: false
      },
      include: {
        user: { select: { name: true, role: true } }
      }
    })

    // Update ticket status to OPEN if it was RESOLVED
    if (ticket.status === 'RESOLVED' || ticket.status === 'REJECTED') {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'OPEN' }
      })
    }

    return NextResponse.json(reply, { status: 201 })
  } catch (error) {
    console.error('Reply ticket error:', error)
    return NextResponse.json({ error: 'Failed to add reply' }, { status: 500 })
  }
}
