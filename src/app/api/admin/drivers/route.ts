import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const drivers = await prisma.driver.findMany({
      where: {
        ...(status && { driverStatus: status }),
        ...(search && {
          user: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }),
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        company: { select: { name: true } },

      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password, companyId, licenceNumber, licenceClass, licenceExpiry, dbsCheckDate, vehicleId } = await req.json()

    const hashedPassword = await bcrypt.hash(password || 'driver123', 10)
    const user = await prisma.user.create({
      data: {
        name, email, phone,
        password: hashedPassword,
        role: 'DRIVER',
        status: 'ACTIVE',
      },
    })

    const driver = await prisma.driver.create({
      data: {
        userId: user.id,
        companyId: companyId || null,
        licenceNumber: licenceNumber || null,
        licenceClass: licenceClass || null,
        licenceExpiry: licenceExpiry ? new Date(licenceExpiry) : null,
        dbsCheckDate: dbsCheckDate ? new Date(dbsCheckDate) : null,
        vehicleId: vehicleId || null,
        driverStatus: 'ACTIVE',
      },
    })

    return NextResponse.json({ ...driver, user }, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Update driver fields
    const driver = await prisma.driver.update({
      where: { id },
      data: {
        ...(fields.licenceNumber !== undefined && { licenceNumber: fields.licenceNumber }),
        ...(fields.licenceClass !== undefined && { licenceClass: fields.licenceClass }),
        ...(fields.licenceExpiry !== undefined && { licenceExpiry: fields.licenceExpiry ? new Date(fields.licenceExpiry) : null }),
        ...(fields.dbsCheckDate !== undefined && { dbsCheckDate: fields.dbsCheckDate ? new Date(fields.dbsCheckDate) : null }),
        ...(fields.companyId !== undefined && { companyId: fields.companyId }),
        ...(fields.driverStatus !== undefined && { driverStatus: fields.driverStatus }),
      },
    })

    // Update associated user fields if provided
    if (fields.name !== undefined || fields.email !== undefined || fields.phone !== undefined) {
      await prisma.user.update({
        where: { id: driver.userId },
        data: {
          ...(fields.name !== undefined && { name: fields.name }),
          ...(fields.email !== undefined && { email: fields.email }),
          ...(fields.phone !== undefined && { phone: fields.phone }),
        },
      })
    }

    const updated = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        company: { select: { name: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update driver' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Get the driver to find the associated userId
    const driver = await prisma.driver.findUnique({ where: { id } })
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Delete driver record first, then the associated user
    await prisma.driver.delete({ where: { id } })
    await prisma.user.delete({ where: { id: driver.userId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete driver' }, { status: 500 })
  }
}
