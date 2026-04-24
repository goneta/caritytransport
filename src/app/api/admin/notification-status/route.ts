import { NextResponse } from 'next/server'
import { isTwilioConfigured, isSendGridConfigured } from '@/lib/notifications'

export async function GET() {
  return NextResponse.json({
    twilio: isTwilioConfigured(),
    sendgrid: isSendGridConfigured(),
    inApp: true, // always active
  })
}
