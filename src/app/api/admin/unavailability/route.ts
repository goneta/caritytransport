import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'
import { dispatchNotification } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const unavailability = await prisma.driverUnavailability.findMany({
      where: status ? { status } : undefined,
      include: {
        driver: {
          include: {
            user: { select: { name: true, email: true, phone: true } }
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    return NextResponse.json(unavailability)
  } catch (error) {
    console.error('Get unavailability error:', error)
    return NextResponse.json({ error: 'Failed to fetch unavailability' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, status, substituteDriverId } = await req.json()

    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 })
    }

    const entry = await prisma.driverUnavailability.findUnique({ where: { id } })
    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const before = await prisma.driverUnavailability.findUnique({ where: { id }, include: { driver: { include: { user: true } } } })

    const updated = await prisma.driverUnavailability.update({
      where: { id },
      data: {
        status,
        substituteDriverId: substituteDriverId || null
      },
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } }
      }
    })

    // If substitute assigned, notify parents
    if (status === 'SUBSTITUTE_ASSIGNED' && substituteDriverId) {
      const substitute = await prisma.driver.findUnique({
        where: { id: substituteDriverId },
        include: { user: { select: { name: true } } }
      })

      // Get affected schedules on that date
      const affectedSchedules = await prisma.transportSchedule.findMany({
        where: { driverId: entry.driverId },
        include: {
          seatAssignments: {
            include: {
              pupil: {
                include: { parent: { include: { user: true } } }
              }
            }
          }
        }
      })

      // Notify affected parents
      for (const schedule of affectedSchedules) {
        for (const seat of schedule.seatAssignments) {
          const parentUserId = seat.pupil.parent.userId
          await dispatchNotification({
            recipientId: parentUserId,
            type: 'SUBSTITUTE_DRIVER',
            subject: 'Substitute Driver Assigned',
            message: `Your child's driver has changed for ${new Date(entry.date).toLocaleDateString('en-GB')}. A substitute driver ${substitute?.user.name || 'TBC'} has been assigned to route ${schedule.routeName}.`,
            triggerEvent: 'SUBSTITUTE_DRIVER_ASSIGNED',
          })
        }
      }

      await prisma.driverUnavailability.update({
        where: { id },
        data: { parentsNotified: true }
      })
    }

    await writeAdminAuditLogForRequest({ request: req, action: 'UPDATE', entity: 'DriverUnavailability', entityId: id, before, after: updated })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update unavailability error:', error)
    return NextResponse.json({ error: 'Failed to update unavailability' }, { status: 500 })
  }
}
