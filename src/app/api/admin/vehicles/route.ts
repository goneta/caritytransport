import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId') || ''

    const vehicles = await prisma.vehicle.findMany({
      where: { ...(companyId && { companyId }) },
      include: {
        company: { select: { name: true } },
        schedules: {
          where: { status: { in: ['SCHEDULED', 'ACTIVE'] } },
          include: {
            _count: { select: { seatAssignments: { where: { status: 'ASSIGNED' } } } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(vehicles)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const vehicle = await prisma.vehicle.create({
      data: {
        companyId: data.companyId,
        type: data.type,
        regPlate: data.regPlate,
        model: data.model || null,
        seats: parseInt(data.seats),
        motExpiry: data.motExpiry ? new Date(data.motExpiry) : null,
        status: 'ACTIVE',
      },
    })
    return NextResponse.json(vehicle, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Registration plate already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(fields.companyId !== undefined && { companyId: fields.companyId }),
        ...(fields.type !== undefined && { type: fields.type }),
        ...(fields.regPlate !== undefined && { regPlate: fields.regPlate }),
        ...(fields.model !== undefined && { model: fields.model }),
        ...(fields.make !== undefined && { make: fields.make }),
        ...(fields.colour !== undefined && { colour: fields.colour }),
        ...(fields.seats !== undefined && { seats: parseInt(fields.seats) }),
        ...(fields.motExpiry !== undefined && { motExpiry: fields.motExpiry ? new Date(fields.motExpiry) : null }),
        ...(fields.insuranceExpiry !== undefined && { insuranceExpiry: fields.insuranceExpiry ? new Date(fields.insuranceExpiry) : null }),
        ...(fields.status !== undefined && { status: fields.status }),
        ...(fields.licenceClass !== undefined && { licenceClass: fields.licenceClass }),
      },
    })

    return NextResponse.json(vehicle)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.vehicle.delete({ where: { id } })

    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'Vehicle', entityId: id, before: null, after: null })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vehicle' }, { status: 500 })
  }
}
