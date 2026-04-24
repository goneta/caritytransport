import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const holidays = await prisma.holidayPeriod.findMany({
      orderBy: { startDate: 'asc' },
    })
    return NextResponse.json(holidays)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, startDate, endDate, schoolId } = await req.json()
    const holiday = await prisma.holidayPeriod.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        schoolId: schoolId || null,
      },
    })
    return NextResponse.json(holiday, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create holiday' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.holidayPeriod.delete({ where: { id } })
    return NextResponse.json({ message: 'Deleted' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete holiday' }, { status: 500 })
  }
}
