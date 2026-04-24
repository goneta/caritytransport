import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { dispatchNotification, dispatchNotificationBulk } from '@/lib/notifications'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId') || ''

    const notifications = await prisma.notification.findMany({
      where: { ...(userId && { recipientId: userId }) },
      orderBy: { sentAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(notifications)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { recipientIds, type, subject, message, triggerEvent } = await req.json()

    if (recipientIds && Array.isArray(recipientIds)) {
      // Bulk send: in-app + SMS + email
      await dispatchNotificationBulk(recipientIds, {
        type: type || 'IN_APP',
        subject,
        message,
        triggerEvent,
      })
      return NextResponse.json({ created: recipientIds.length })
    }

    // Single send: in-app + SMS + email
    const recipientId = req.headers.get('x-user-id') || ''
    await dispatchNotification({
      recipientId,
      type: type || 'IN_APP',
      subject,
      message,
      triggerEvent,
    })
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
