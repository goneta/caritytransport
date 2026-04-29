import type { PushSubscription as WebPushSubscription } from 'web-push'
import prisma from '@/lib/prisma'

export function isWebPushConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT &&
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY !== 'your-vapid-public-key'
  )
}

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null
}

export interface BrowserPushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

interface StoredPushSubscription {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

function toWebPushSubscription(subscription: StoredPushSubscription): WebPushSubscription {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }
}

export async function sendPushToUser(userId: string, payload: BrowserPushPayload): Promise<{ sent: number; failed: number }> {
  if (!isWebPushConfigured()) return { sent: 0, failed: 0 }

  const webPush = await import('web-push')
  webPush.default.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId, active: true },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  })

  let sent = 0
  let failed = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.default.sendNotification(
          toWebPushSubscription(subscription),
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || '/parent/notifications',
            tag: payload.tag || 'carity-notification',
          })
        )
        sent += 1
      } catch (error: any) {
        failed += 1
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { active: false },
          })
        } else {
          console.warn(`Push delivery failed for user ${userId}:`, error?.message || error)
        }
      }
    })
  )

  return { sent, failed }
}
