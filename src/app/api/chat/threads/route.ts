import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isAdminRole } from '@/lib/moderated-chat'

const chatRoles = ['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS', 'DRIVER', 'PARENT']

async function canStartThreadWith(currentUserId: string, currentRole: string, participantIds: string[]) {
  if (participantIds.length === 0 || participantIds.length > 8) return false
  if (participantIds.includes(currentUserId)) return false

  const participants = await prisma.user.findMany({
    where: { id: { in: participantIds }, role: { in: chatRoles }, status: { not: 'SUSPENDED' } },
    select: { id: true, role: true },
  })
  if (participants.length !== participantIds.length) return false
  if (isAdminRole(currentRole)) return true

  const hasAdmin = participants.some((participant) => isAdminRole(participant.role))
  if (hasAdmin) return true

  if (currentRole === 'PARENT') {
    const parent = await prisma.parent.findUnique({
      where: { userId: currentUserId },
      include: {
        pupils: {
          include: {
            seatAssignments: { include: { schedule: { include: { driver: { select: { userId: true } } } } } },
            bookingItems: { include: { schedule: { include: { driver: { select: { userId: true } } } } } },
          },
        },
      },
    })
    const allowedDriverIds = new Set<string>()
    parent?.pupils.forEach((pupil) => {
      pupil.seatAssignments.forEach((assignment) => {
        if (assignment.schedule.driver?.userId) allowedDriverIds.add(assignment.schedule.driver.userId)
      })
      pupil.bookingItems.forEach((item) => {
        if (item.schedule.driver?.userId) allowedDriverIds.add(item.schedule.driver.userId)
      })
    })
    return participantIds.every((id) => allowedDriverIds.has(id))
  }

  if (currentRole === 'DRIVER') {
    const driver = await prisma.driver.findUnique({
      where: { userId: currentUserId },
      include: {
        schedules: {
          include: {
            seatAssignments: {
              include: {
                pupil: {
                  include: {
                    parent: { select: { userId: true } },
                  },
                },
              },
            },
            bookingItems: {
              include: {
                booking: { select: { userId: true } },
              },
            },
          },
        },
      },
    })
    const allowedParentIds = new Set<string>()
    driver?.schedules.forEach((schedule) => {
      schedule.seatAssignments.forEach((assignment) => allowedParentIds.add(assignment.pupil.parent.userId))
      schedule.bookingItems.forEach((item) => allowedParentIds.add(item.booking.userId))
    })
    return participantIds.every((id) => allowedParentIds.has(id))
  }

  return false
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!currentUser || !chatRoles.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Chat is not available for this account' }, { status: 403 })
    }

    const where = isAdminRole(currentUser.role)
      ? {}
      : { participants: { some: { userId: currentUser.id } } }

    const threads = await prisma.chatThread.findMany({
      where,
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { sender: { select: { id: true, name: true, email: true, role: true } } },
        },
        schedule: { select: { id: true, routeName: true, direction: true, departureTime: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ threads })
  } catch (error) {
    console.error('Chat thread list error:', error)
    return NextResponse.json({ error: 'Failed to load chat threads' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!currentUser || !chatRoles.includes(currentUser.role)) {
      return NextResponse.json({ error: 'Chat is not available for this account' }, { status: 403 })
    }

    const body = await request.json()
    const participantIds = Array.from(new Set((body.participantIds || []).filter((id: unknown) => typeof id === 'string'))) as string[]
    const subject = typeof body.subject === 'string' && body.subject.trim() ? body.subject.trim().slice(0, 120) : 'Transport conversation'
    const scheduleId = typeof body.scheduleId === 'string' && body.scheduleId.trim() ? body.scheduleId.trim() : null

    const permitted = await canStartThreadWith(currentUser.id, currentUser.role, participantIds)
    if (!permitted) return NextResponse.json({ error: 'You can only start chats with assigned route contacts or operations staff' }, { status: 403 })

    if (scheduleId) {
      const schedule = await prisma.transportSchedule.findUnique({ where: { id: scheduleId }, select: { id: true } })
      if (!schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 })
    }

    const allParticipantIds = [currentUser.id, ...participantIds]
    const thread = await prisma.chatThread.create({
      data: {
        subject,
        contextType: scheduleId ? 'SCHEDULE' : null,
        contextId: scheduleId,
        scheduleId,
        createdById: currentUser.id,
        participants: {
          create: allParticipantIds.map((userId) => ({
            userId,
            role: userId === currentUser.id ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: {
        participants: { include: { user: { select: { id: true, name: true, email: true, role: true } } } },
        messages: true,
        schedule: { select: { id: true, routeName: true, direction: true, departureTime: true } },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'CHAT_THREAD_CREATED',
        entity: 'ChatThread',
        entityId: thread.id,
        after: JSON.stringify({ participantCount: allParticipantIds.length, subject, scheduleId }),
      },
    })

    return NextResponse.json({ thread }, { status: 201 })
  } catch (error) {
    console.error('Chat thread create error:', error)
    return NextResponse.json({ error: 'Failed to create chat thread' }, { status: 500 })
  }
}
