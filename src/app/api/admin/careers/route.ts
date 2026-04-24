import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { hash } from 'bcryptjs'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'OPERATIONS']

const POSITION_TO_ROLE: Record<string, string> = {
  Operations: 'OPERATIONS',
  Drivers: 'DRIVER',
  Scheduler: 'SCHEDULER',
  Admin: 'ADMIN',
  'Pupil Carer': 'OPERATIONS',
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const position = searchParams.get('position')

    const where: any = {}

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { surname: { contains: search } },
        { email: { contains: search } },
        { referenceCode: { contains: search } },
      ]
    }

    if (status) {
      where.status = status
    }

    if (position) {
      where.positionIds = { contains: position }
    }

    const applications = await prisma.jobApplication.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      include: { files: true },
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Admin careers GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!ALLOWED_ROLES.includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { id, action, ...data } = body

    if (!id || !action) {
      return NextResponse.json(
        { error: 'Missing id or action' },
        { status: 400 }
      )
    }

    let updateData: any = {}

    switch (action) {
      case 'mark_reviewed': {
        updateData.status = 'REVIEWED'
        break
      }

      case 'reject': {
        updateData.status = 'REJECTED'
        break
      }

      case 'schedule_interview': {
        updateData.status = 'INTERVIEW'
        updateData.interviewData = JSON.stringify(data.interviewData || data)
        break
      }

      case 'hire': {
        updateData.status = 'HIRED'

        const application = await prisma.jobApplication.findUnique({
          where: { id },
        })
        if (!application) {
          return NextResponse.json(
            { error: 'Application not found' },
            { status: 404 }
          )
        }

        const { username, password, position, startDate } = data

        if (!username || !password) {
          return NextResponse.json(
            { error: 'Username and password required for hiring' },
            { status: 400 }
          )
        }

        const hashedPassword = await hash(password, 12)

        const mappedRole =
          POSITION_TO_ROLE[position || application.positionNames.split(',')[0]] ||
          'OPERATIONS'

        const newUser = await prisma.user.create({
          data: {
            name: `${application.firstName} ${application.surname}`,
            email: username,
            password: hashedPassword,
            role: mappedRole,
            status: 'ACTIVE',
            phone: application.mobile || null,
            address: application.address || null,
          },
        })

        updateData.employeeData = JSON.stringify({
          employeeId: newUser.id,
          position: position || application.positionNames.split(',')[0],
          startDate: startDate || new Date().toISOString(),
          username,
          createdAt: new Date().toISOString(),
        })
        break
      }

      case 'add_note': {
        const application = await prisma.jobApplication.findUnique({
          where: { id },
        })
        if (!application) {
          return NextResponse.json(
            { error: 'Application not found' },
            { status: 404 }
          )
        }

        const existingNotes = application.internalNotes
          ? JSON.parse(application.internalNotes)
          : []

        existingNotes.push({
          text: data.text,
          author: (session.user as any).name || session.user.email,
          at: new Date().toISOString(),
        })

        updateData.internalNotes = JSON.stringify(existingNotes)
        break
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: updateData,
      include: { files: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin careers PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}
