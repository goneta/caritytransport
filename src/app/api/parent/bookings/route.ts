import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''

    const bookings = await prisma.booking.findMany({
      where: {
        userId: session.user.id,
        ...(status && { status }),
      },
      include: {
        items: {
          where: {
            ...(dateFrom && dateTo && {
              tripDate: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
              },
            }),
          },
          include: {
            schedule: {
              include: {
                school: { select: { name: true } },
                vehicle: { select: { regPlate: true, type: true, model: true, make: true } },
                driver: { include: { user: { select: { name: true } } } },
              },
            },
            pupil: { select: { fullName: true, studentNumber: true, yearLevel: true } },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
