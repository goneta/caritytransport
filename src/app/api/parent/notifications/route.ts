import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || ''

    const notifications = await prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { sentAt: 'desc' },
      take: 30,
    })
    return NextResponse.json(notifications)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { id } = await req.json()
    await prisma.notification.update({ where: { id }, data: { read: true } })
    return NextResponse.json({ message: 'Marked as read' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}
