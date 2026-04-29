# Carity Transport

Carity Transport is a Next.js application for managing school transport bookings, parent self-service, driver workflows, pupil trip visibility, and administrator operations.

## Getting Started

Install dependencies, generate the Prisma client, and start the development server.

```bash
npm install
npx prisma generate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in the browser.

## Required Environment Variables

Create a local `.env` file before running the application. The application uses SQLite through Prisma by default, NextAuth for credential sessions, Stripe for live payment collection and refunds, and an optional AI provider for richer chatbot responses.

| Variable | Required | Purpose |
|---|---:|---|
| `DATABASE_URL` | Yes | Prisma database URL. For local SQLite, use a file URL such as `file:./dev.db`. |
| `NEXTAUTH_SECRET` | Yes | Secret used to sign NextAuth JWT sessions and middleware tokens. |
| `NEXTAUTH_URL` | Recommended | Canonical application URL used by auth and notification links. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Public app URL used when generating Stripe success and cancel redirects. Falls back to `NEXTAUTH_URL` or the request host. |
| `STRIPE_SECRET_KEY` | Yes for live payments | Server-side Stripe secret key used to create Checkout Sessions and refunds. |
| `STRIPE_WEBHOOK_SECRET` | Recommended for production | Stripe webhook signing secret used to verify incoming webhook events. If omitted, local development webhooks are accepted without signature verification. |
| `AI_PROVIDER` | Optional | `openai` or `anthropic`; defaults to `anthropic` when omitted. |
| `AI_MODEL` | Optional | Overrides the default model for the selected AI provider. |
| `OPENAI_API_KEY` | Required when `AI_PROVIDER=openai` | API key for OpenAI-compatible chat completions. |
| `ANTHROPIC_API_KEY` | Required when `AI_PROVIDER=anthropic` | API key for Anthropic-compatible chat completions. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Optional | Enables SMS notifications. |
| `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME` | Optional | Enables email notifications. |

A minimal local configuration looks like this:

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
STRIPE_SECRET_KEY="sk_test_replace_me"
STRIPE_WEBHOOK_SECRET="whsec_replace_me"
AI_PROVIDER="openai"
OPENAI_API_KEY="replace_me"
```

## Stripe Checkout and Webhook Setup

The parent basket now creates a real Stripe Checkout Session. On successful payment, Stripe redirects the parent back to `/parent/bookings`, and the webhook endpoint reconciles the booking and payment rows in the database. Configure the webhook in Stripe to call:

```text
POST https://your-domain.example/api/stripe/webhook
```

Subscribe the webhook to these Checkout events:

| Stripe event | Application behavior |
|---|---|
| `checkout.session.completed` | Confirms the booking, activates booking items, stores the Stripe session and payment intent IDs, and marks the payment as completed. |
| `checkout.session.expired` | Cancels only still-pending bookings and releases the pending payment state. |
| `checkout.session.async_payment_failed` | Marks still-pending bookings and payments as payment failed. |

When a parent cancels a Stripe Checkout flow, `/api/stripe/cancel` marks the pending booking as cancelled and restores the booking items to the basket so the parent can retry. Parent cancellations and administrator refund overrides now share the same Stripe refund helper and keep the existing cancellation rules.

## Live Vehicle Tracking

Drivers can publish route-progress and GPS updates from the existing driver schedule workflow. The tracking endpoint stores those updates as `TripLog` records with the assigned schedule, driver, vehicle, route status, optional latitude and longitude, and notes. Parents view confirmed booking items on the parent tracking page, which now reads current schedule, vehicle, driver, GPS, and trip timeline data from the database.

Location sharing requires the driver browser to grant geolocation permission. If coordinates are unavailable, drivers can still post status updates, and parents will see the latest operational status without map coordinates.

## Database-Backed Chatbot

The chatbot endpoint now uses the authenticated session rather than trusting arbitrary client-provided user IDs. It enriches prompts and fallback responses with the current user role, recent bookings, payments, schedules, pupils, and trip logs from the database. External AI remains optional: when the provider is not configured, the rule-based fallback can still answer common booking, payment, and live-tracking questions from database context.

## Verification

Run these checks before deploying:

```bash
npx prisma generate
npm run build
npm run lint
```

The production build must complete successfully. Lint should be reviewed separately if the project already contains stylistic or historical warnings unrelated to the new payment, tracking, or chatbot implementation.

## Useful Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run build` | Compile the production build and run TypeScript checks. |
| `npm run start` | Start the production server after building. |
| `npm run lint` | Run ESLint. |
| `npx prisma generate` | Regenerate Prisma Client after schema or dependency updates. |
