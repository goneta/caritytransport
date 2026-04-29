import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) return null

  if (!stripeClient) {
    stripeClient = new Stripe(secretKey)
  }

  return stripeClient
}

export function requireStripeClient() {
  const stripe = getStripeClient()
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY to enable live payments.')
  }
  return stripe
}

export function getAppUrl(req?: Request) {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
  if (configuredUrl) return configuredUrl.replace(/\/$/, '')

  if (req) {
    const url = new URL(req.url)
    return `${url.protocol}//${url.host}`
  }

  return 'http://localhost:3000'
}

export function toStripeAmount(amount: number) {
  return Math.round(amount * 100)
}
