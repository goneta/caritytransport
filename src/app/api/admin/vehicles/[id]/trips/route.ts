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

    // Get vehicle details
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } }
      }
    })

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    }

    // Get trip logs for this vehicle
    const [trips, total] = await Promise.all([
      prisma.tripLog.findMany({
        where: { vehicleId: id },
        include: {
          schedule: {
            select: {
              routeName: true,
              direction: true,
              school: { select: { name: true } }
            }
          },
          driver: {
            include: { user: { select: { name: true, phone: true } } }
          },
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
      prisma.tripLog.count({ where: { vehicleId: id } })
    ])

    // Get passenger counts per schedule
    const schedules = await prisma.transportSchedule.findMany({
      where: { vehicleId: id },
      include: {
        school: { select: { name: true } },
        driver: { include: { user: { select: { name: true } } } },
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
      }
    })

    return NextResponse.json({
      vehicle,
      trips,
      total,
      page,
      pages: Math.ceil(total / limit),
      schedules
    })
  } catch (error) {
    console.error('Vehicle trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle trips' }, { status: 500 })
  }
}
