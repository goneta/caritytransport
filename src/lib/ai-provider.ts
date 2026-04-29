export type AIProvider = 'anthropic' | 'openai'

export interface AIProviderConfig {
  provider: AIProvider
  model: string
  configured: boolean
}

function readProvider(): AIProvider {
  const raw = (process.env.AI_PROVIDER || 'anthropic').toLowerCase()
  return raw === 'openai' ? 'openai' : 'anthropic'
}

export function getAIProviderConfig(): AIProviderConfig {
  const provider = readProvider()
  const model =
    process.env.AI_MODEL ||
    (provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-5-sonnet-latest')
  const configured = provider === 'openai'
    ? Boolean(process.env.OPENAI_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY)

  return { provider, model, configured }
}

export async function requestAIResponse(prompt: string): Promise<string | null> {
  const { provider, model, configured } = getAIProviderConfig()
  if (!configured) return null

  if (provider === 'openai') {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || null
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content?.[0]?.text?.trim() || null
}
