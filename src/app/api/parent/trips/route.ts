import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit
    const status = searchParams.get('status')
    const direction = searchParams.get('direction')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Find parent
    const parent = await prisma.parent.findFirst({
      where: { userId: session.user.id },
      include: { pupils: { select: { id: true } } }
    })

    if (!parent) {
      return NextResponse.json({ trips: [], total: 0, pages: 0 })
    }

    const pupilIds = parent.pupils.map((p: { id: string }) => p.id)

    const whereClause: Record<string, unknown> = {
      pupilId: { in: pupilIds }
    }

    if (status) whereClause.status = status
    if (direction) whereClause.direction = direction
    if (dateFrom || dateTo) {
      whereClause.tripDate = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {})
      }
    }

    const [trips, total] = await Promise.all([
      prisma.bookingItem.findMany({
        where: whereClause,
        include: {
          schedule: {
            include: {
              school: { select: { name: true } },
              driver: {
                include: {
                  user: { select: { name: true, phone: true, image: true } }
                }
              },
              vehicle: { select: { regPlate: true, make: true, model: true } }
            }
          },
          pupil: { select: { fullName: true, yearLevel: true } },
          booking: { select: { id: true, status: true } }
        },
        orderBy: { tripDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.bookingItem.count({ where: whereClause })
    ])

    return NextResponse.json({
      trips,
      total,
      page,
      pages: Math.ceil(total / limit)
    })
  } catch (error) {
    console.error('Parent trips error:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}
