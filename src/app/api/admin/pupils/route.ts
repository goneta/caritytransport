import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const schoolId = searchParams.get('schoolId') || ''

    const pupils = await prisma.pupil.findMany({
      where: {
        ...(schoolId && { schoolId }),
        ...(search && {
          OR: [
            { fullName: { contains: search } },
            { studentNumber: { contains: search } },
          ],
        }),
      },
      include: {
        school: { select: { name: true } },
        parent: { include: { user: { select: { name: true, email: true, phone: true } } } },
        seatAssignments: {
          where: { status: 'ASSIGNED' },
          include: { schedule: { select: { routeName: true, departureTime: true } } },
        },
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(pupils)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch pupils' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const pupil = await prisma.pupil.create({ data })
    return NextResponse.json(pupil, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create pupil' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const pupil = await prisma.pupil.update({
      where: { id },
      data: {
        ...(fields.fullName !== undefined && { fullName: fields.fullName }),
        ...(fields.dateOfBirth !== undefined && { dateOfBirth: fields.dateOfBirth ? new Date(fields.dateOfBirth) : null }),
        ...(fields.yearLevel !== undefined && { yearLevel: fields.yearLevel }),
        ...(fields.studentNumber !== undefined && { studentNumber: fields.studentNumber }),
        ...(fields.schoolId !== undefined && { schoolId: fields.schoolId }),
        ...(fields.parentId !== undefined && { parentId: fields.parentId }),
        ...(fields.pickupLocation !== undefined && { pickupLocation: fields.pickupLocation }),
        ...(fields.pickupPostcode !== undefined && { pickupPostcode: fields.pickupPostcode }),
        ...(fields.specialRequirements !== undefined && { specialRequirements: fields.specialRequirements }),
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.emergencyContactName !== undefined && { emergencyContactName: fields.emergencyContactName }),
        ...(fields.emergencyContactPhone !== undefined && { emergencyContactPhone: fields.emergencyContactPhone }),
        ...(fields.phone !== undefined && { phone: fields.phone }),
      },
    })

    return NextResponse.json(pupil)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update pupil' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.pupil.delete({ where: { id } })

    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'Pupil', entityId: id, before: null, after: null })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete pupil' }, { status: 500 })
  }
}
