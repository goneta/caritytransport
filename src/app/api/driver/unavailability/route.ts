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

    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const unavailability = await prisma.driverUnavailability.findMany({
      where: { driverId: driver.id },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(unavailability)
  } catch (error) {
    console.error('Get unavailability error:', error)
    return NextResponse.json({ error: 'Failed to fetch unavailability' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const driver = await prisma.driver.findFirst({
      where: { userId: session.user.id },
      include: { user: true }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const { date, reason } = await req.json()

    if (!date || !reason) {
      return NextResponse.json({ error: 'Date and reason are required' }, { status: 400 })
    }

    // Check for existing unavailability on that date
    const existingEntry = await prisma.driverUnavailability.findFirst({
      where: {
        driverId: driver.id,
        date: new Date(date)
      }
    })

    if (existingEntry) {
      return NextResponse.json({ error: 'Unavailability already logged for this date' }, { status: 409 })
    }

    const unavailability = await prisma.driverUnavailability.create({
      data: {
        driverId: driver.id,
        date: new Date(date),
        reason,
        status: 'PENDING',
        adminNotified: false,
        parentsNotified: false
      }
    })

    // Notify admin users
    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'SCHEDULER'] } }
    })

    for (const admin of admins) {
      await dispatchNotification({
        recipientId: admin.id,
        type: 'DRIVER_UNAVAILABLE',
        subject: `Driver Unavailability: ${driver.user.name}`,
        message: `Driver ${driver.user.name} has marked themselves unavailable on ${new Date(date).toLocaleDateString('en-GB')}. Reason: ${reason}. A substitute driver may need to be assigned.`,
        triggerEvent: 'DRIVER_UNAVAILABILITY',
      })
    }

    // Mark admin notified
    await prisma.driverUnavailability.update({
      where: { id: unavailability.id },
      data: { adminNotified: true }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DRIVER_UNAVAILABILITY',
        entity: 'DriverUnavailability',
        entityId: unavailability.id,
        after: JSON.stringify({ date, reason })
      }
    })

    return NextResponse.json(unavailability, { status: 201 })
  } catch (error) {
    console.error('Post unavailability error:', error)
    return NextResponse.json({ error: 'Failed to create unavailability' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    const driver = await prisma.driver.findFirst({ where: { userId: session.user.id } })
    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    const entry = await prisma.driverUnavailability.findFirst({
      where: { id, driverId: driver.id }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    await prisma.driverUnavailability.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete unavailability error:', error)
    return NextResponse.json({ error: 'Failed to delete unavailability' }, { status: 500 })
  }
}
