import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: { select: { pupils: true, schedules: true } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(schools)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const school = await prisma.school.create({
      data: {
        name: data.name,
        address: data.address,
        contactName: data.contactName || null,
        contactPhone: data.contactPhone || null,
        contactEmail: data.contactEmail || null,
        startTime: data.startTime || null,
        endTime: data.endTime || null,
        status: 'ACTIVE',
      },
    })
    return NextResponse.json(school, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create school' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const school = await prisma.school.update({
      where: { id },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.address !== undefined && { address: fields.address }),
        ...(fields.contactName !== undefined && { contactName: fields.contactName }),
        ...(fields.contactPhone !== undefined && { contactPhone: fields.contactPhone }),
        ...(fields.contactEmail !== undefined && { contactEmail: fields.contactEmail }),
        ...(fields.startTime !== undefined && { startTime: fields.startTime }),
        ...(fields.endTime !== undefined && { endTime: fields.endTime }),
        ...(fields.postcode !== undefined && { postcode: fields.postcode }),
        ...(fields.status !== undefined && { status: fields.status }),
      },
    })

    return NextResponse.json(school)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update school' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.school.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 })
  }
}
