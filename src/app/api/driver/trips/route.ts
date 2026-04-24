import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'

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

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const [trips, total] = await Promise.all([
      prisma.tripLog.findMany({
        where: { driverId: driver.id },
        include: {
          schedule: {
            select: {
              routeName: true,
              direction: true,
              school: { select: { name: true } }
            }
          },
          vehicle: { select: { regPlate: true, make: true, model: true } },
          pupil: {
            select: {
              fullName: true,
              yearLevel: true,
              parent: { include: { user: { select: { name: true, phone: true } } } }
            }
          }
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit
      }),
      prisma.tripLog.count({ where: { driverId: driver.id } })
    ])

    return NextResponse.json({ trips, total, page, pages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Driver trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}
