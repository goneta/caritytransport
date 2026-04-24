import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    // Get driver details
    const driver = await prisma.driver.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, phone: true, status: true, image: true } },
        company: { select: { name: true } },
        unavailability: { orderBy: { date: 'desc' }, take: 10 }
      }
    })

    if (!driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 })
    }

    // Get trip logs for this driver
    const [trips, total] = await Promise.all([
      prisma.tripLog.findMany({
        where: { driverId: id },
        include: {
          schedule: {
            select: {
              routeName: true,
              direction: true,
              school: { select: { name: true } }
            }
          },
          vehicle: { select: { regPlate: true, make: true, model: true, type: true } },
          pupil: {
            select: {
              fullName: true,
              yearLevel: true,
              school: { select: { name: true } }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.tripLog.count({ where: { driverId: id } })
    ])

    // Get passenger summary for this driver's schedules
    const schedules = await prisma.transportSchedule.findMany({
      where: { driverId: id },
      include: {
        school: { select: { name: true } },
        vehicle: { select: { regPlate: true, seats: true } },
        seatAssignments: {
          include: {
            pupil: {
              select: {
                fullName: true,
                yearLevel: true,
                school: { select: { name: true } },
                parent: { include: { user: { select: { name: true, phone: true } } } }
              }
            }
          }
        },
        _count: { select: { seatAssignments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      driver,
      trips,
      total,
      page,
      pages: Math.ceil(total / limit),
      schedules
    })
  } catch (error) {
    console.error('Driver trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch driver trips' }, { status: 500 })
  }
}
