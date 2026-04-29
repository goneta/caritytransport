import { NextResponse } from 'next/server'
import { getAIProviderConfig } from '@/lib/ai-provider'

export async function GET() {
  const config = getAIProviderConfig()
  return NextResponse.json({
    provider: config.provider,
    model: config.model,
    configured: config.configured,
    recommended: 'env',
  })
}
