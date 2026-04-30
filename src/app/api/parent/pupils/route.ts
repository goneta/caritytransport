import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parent = await prisma.parent.findUnique({ where: { userId: session.user.id } })
    if (!parent) return NextResponse.json([])

    const pupils = await prisma.pupil.findMany({
      where: { parentId: parent.id, status: 'ACTIVE' },
      include: {
        school: { select: { name: true, address: true } },
        seatAssignments: {
          where: { status: { in: ['ASSIGNED', 'WAITLISTED'] } },
          include: {
            schedule: {
              include: {
                driver: { include: { user: { select: { name: true, phone: true } } } },
                vehicle: { select: { regPlate: true, model: true, type: true } },
              },
            },
          },
        },
        absences: {
          where: { date: { gte: new Date() } },
          orderBy: { date: 'asc' },
        },
        routeChangeRequests: {
          where: { status: { in: ['PENDING', 'APPROVED'] } },
          orderBy: { startDate: 'asc' },
          include: {
            currentSchedule: { select: { routeName: true, departureTime: true } },
            requestedSchedule: { select: { routeName: true, departureTime: true } },
          },
        },
      },
    })

    return NextResponse.json(pupils)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch pupils' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await req.json()
    const { fullName, dateOfBirth, yearLevel, studentNumber, schoolId, pickupLocation, pickupPostcode, specialRequirements, emergencyContactName, emergencyContactPhone } = data

    const parent = await prisma.parent.findUnique({ where: { userId: session.user.id } })
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const pupil = await prisma.pupil.create({
      data: {
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        yearLevel: yearLevel || null,
        studentNumber: studentNumber || null,
        schoolId: schoolId || null,
        parentId: parent.id,
        pickupLocation: pickupLocation || null,
        pickupPostcode: pickupPostcode || null,
        specialRequirements: specialRequirements || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        activeTransport: true,
      },
      include: { school: { select: { name: true } } },
    })

    return NextResponse.json(pupil, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to add pupil' }, { status: 500 })
  }
}
