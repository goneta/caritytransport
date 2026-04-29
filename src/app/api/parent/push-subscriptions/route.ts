import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { getVapidPublicKey, isWebPushConfigured } from '@/lib/push'

async function requireParentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findFirst({
    where: { id: session.user.id, role: 'PARENT' },
    select: { id: true, notifyPush: true },
  })

  return user
}

export async function GET() {
  try {
    const user = await requireParentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const activeCount = await prisma.pushSubscription.count({
      where: { userId: user.id, active: true },
    })

    return NextResponse.json({
      publicKey: getVapidPublicKey(),
      configured: isWebPushConfigured(),
      subscribed: activeCount > 0,
      notifyPush: user.notifyPush,
    })
  } catch (error) {
    console.error('Push subscription status error:', error)
    return NextResponse.json({ error: 'Failed to load push subscription status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireParentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''
    const p256dh = typeof body?.keys?.p256dh === 'string' ? body.keys.p256dh : ''
    const authKey = typeof body?.keys?.auth === 'string' ? body.keys.auth : ''

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'A valid browser push subscription is required' }, { status: 400 })
    }

    await prisma.$transaction([
      prisma.pushSubscription.upsert({
        where: { endpoint },
        update: {
          userId: user.id,
          p256dh,
          auth: authKey,
          userAgent: req.headers.get('user-agent') || null,
          active: true,
        },
        create: {
          userId: user.id,
          endpoint,
          p256dh,
          auth: authKey,
          userAgent: req.headers.get('user-agent') || null,
          active: true,
        },
      }),
      prisma.user.update({ where: { id: user.id }, data: { notifyPush: true } }),
    ])

    return NextResponse.json({ success: true, subscribed: true, notifyPush: true })
  } catch (error) {
    console.error('Push subscription save error:', error)
    return NextResponse.json({ error: 'Failed to save push subscription' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireParentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const endpoint = typeof body?.endpoint === 'string' ? body.endpoint : ''

    await prisma.$transaction([
      prisma.pushSubscription.updateMany({
        where: endpoint ? { userId: user.id, endpoint } : { userId: user.id },
        data: { active: false },
      }),
      prisma.user.update({ where: { id: user.id }, data: { notifyPush: false } }),
    ])

    return NextResponse.json({ success: true, subscribed: false, notifyPush: false })
  } catch (error) {
    console.error('Push subscription delete error:', error)
    return NextResponse.json({ error: 'Failed to disable push notifications' }, { status: 500 })
  }
}
