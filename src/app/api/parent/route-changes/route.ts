
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { dispatchNotificationBulk } from '@/lib/notifications'

async function getParentForSession() {
  const session = await auth()
  if (!session?.user?.id) return null
  return prisma.parent.findUnique({ where: { userId: session.user.id }, include: { user: true } })
}

export async function GET() {
  try {
    const parent = await getParentForSession()
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const requests = await prisma.routeChangeRequest.findMany({
      where: { userId: parent.userId },
      orderBy: [{ status: 'asc' }, { startDate: 'asc' }],
      include: {
        pupil: { select: { id: true, fullName: true, school: { select: { name: true } } } },
        currentSchedule: { select: { id: true, routeName: true, departureTime: true } },
        requestedSchedule: { select: { id: true, routeName: true, departureTime: true, school: { select: { name: true } } } },
      },
    })

    return NextResponse.json(requests)
  } catch (error) {
    console.error('GET /api/parent/route-changes error', error)
    return NextResponse.json({ error: 'Failed to load route-change requests' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const parent = await getParentForSession()
    if (!parent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { pupilId, currentScheduleId, requestedScheduleId, startDate, endDate, reason } = body
    if (!pupilId || !requestedScheduleId || !startDate) {
      return NextResponse.json({ error: 'Pupil, requested route, and start date are required' }, { status: 400 })
    }

    const pupil = await prisma.pupil.findFirst({ where: { id: pupilId, parentId: parent.id } })
    if (!pupil) return NextResponse.json({ error: 'Pupil not found' }, { status: 404 })

    const requestedSchedule = await prisma.transportSchedule.findUnique({ where: { id: requestedScheduleId } })
    if (!requestedSchedule) return NextResponse.json({ error: 'Requested route not found' }, { status: 404 })

    const request = await prisma.routeChangeRequest.create({
      data: {
        userId: parent.userId,
        pupilId,
        currentScheduleId: currentScheduleId || null,
        requestedScheduleId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        reason: reason || null,
        status: 'PENDING',
      },
      include: {
        pupil: { select: { fullName: true } },
        requestedSchedule: { select: { routeName: true, departureTime: true } },
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: { in: ['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'] }, status: 'ACTIVE' },
      select: { id: true },
    })
    if (admins.length > 0) {
      await dispatchNotificationBulk(admins.map((admin) => admin.id), {
        type: 'IN_APP',
        subject: 'Temporary route-change request submitted',
        message: `${parent.user.name || parent.user.email} requested ${request.requestedSchedule?.routeName || 'a temporary route'} for ${request.pupil.fullName} starting ${new Date(startDate).toLocaleDateString('en-GB')}.`,
        triggerEvent: 'ROUTE_CHANGE_REQUESTED',
        senderId: parent.userId,
      })
    }

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    console.error('POST /api/parent/route-changes error', error)
    return NextResponse.json({ error: 'Failed to submit route-change request' }, { status: 500 })
  }
}
