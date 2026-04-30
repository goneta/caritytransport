import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SCHEDULER", "OPERATIONS"])

type SessionUser = {
  role?: string | null
}

type SegmentRow = {
  key: string
  label: string
  revenue: number
  refunds: number
  net: number
  bookings: number
  refundedBookings: number
}

function asCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function emptySegment(key: string, label: string): SegmentRow {
  return { key, label, revenue: 0, refunds: 0, net: 0, bookings: 0, refundedBookings: 0 }
}

function addSegment(map: Map<string, SegmentRow>, key: string, label: string, revenue: number, refund: number) {
  const row = map.get(key) ?? emptySegment(key, label)
  row.revenue = asCurrency(row.revenue + revenue)
  row.refunds = asCurrency(row.refunds + refund)
  row.net = asCurrency(row.revenue - row.refunds)
  if (revenue > 0) row.bookings += 1
  if (refund > 0) row.refundedBookings += 1
  map.set(key, row)
}

function toRows(map: Map<string, SegmentRow>, limit?: number) {
  const rows = Array.from(map.values()).map(row => ({ ...row, net: asCurrency(row.revenue - row.refunds) }))
  rows.sort((a, b) => b.revenue - a.revenue || b.refunds - a.refunds || a.label.localeCompare(b.label))
  return typeof limit === "number" ? rows.slice(0, limit) : rows
}

function paymentMethodLabel(booking: { totalAmount: number; stripePaymentId: string | null; stripeSessionId: string | null; payment: { stripePaymentId: string | null; stripeSessionId: string | null; status: string } | null }) {
  if (booking.totalAmount <= 0) return "No charge"
  if (booking.payment?.stripePaymentId || booking.payment?.stripeSessionId || booking.stripePaymentId || booking.stripeSessionId) return "Card / Stripe"
  return "Manual / Unknown"
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export async function GET(request: Request) {
  try {
    const session = await auth()
    const role = (session?.user as SessionUser | undefined)?.role ?? ""
    if (!session?.user?.id || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const end = searchParams.get("end") ? new Date(searchParams.get("end") as string) : new Date()
    const start = searchParams.get("start")
      ? new Date(searchParams.get("start") as string)
      : new Date(end.getFullYear(), end.getMonth() - 5, 1)
    end.setHours(23, 59, 59, 999)

    const items = await prisma.bookingItem.findMany({
      where: {
        booking: {
          createdAt: { gte: start, lte: end },
        },
      },
      include: {
        booking: {
          include: {
            payment: true,
          },
        },
        schedule: {
          include: {
            school: true,
          },
        },
        pupil: {
          include: {
            school: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const bySchool = new Map<string, SegmentRow>()
    const byRoute = new Map<string, SegmentRow>()
    const byDate = new Map<string, SegmentRow>()
    const byPaymentMethod = new Map<string, SegmentRow>()
    const bookingTotals = new Map<string, { revenue: number; refund: number; method: string; date: Date }>()

    for (const item of items) {
      const booking = item.booking
      const isConfirmedRevenue = ["CONFIRMED", "COMPLETED"].includes(booking.status) || booking.payment?.status === "PAID"
      const isRefunded = booking.status === "REFUNDED" || booking.payment?.status === "REFUNDED" || Boolean(booking.refundedAt || booking.refundId)
      const revenue = isConfirmedRevenue ? item.price : 0
      const refund = isRefunded ? item.price : 0
      const schoolName = item.schedule.school?.name ?? item.pupil.school?.name ?? "Unassigned school"
      const routeName = item.schedule.routeName || "Unnamed route"
      const method = paymentMethodLabel(booking)
      const day = dateKey(booking.createdAt)

      addSegment(bySchool, schoolName, schoolName, revenue, refund)
      addSegment(byRoute, item.scheduleId, routeName, revenue, refund)
      addSegment(byDate, day, day, revenue, refund)
      addSegment(byPaymentMethod, method, method, revenue, refund)

      const current = bookingTotals.get(booking.id) ?? { revenue: 0, refund: 0, method, date: booking.createdAt }
      current.revenue = asCurrency(current.revenue + revenue)
      current.refund = asCurrency(current.refund + refund)
      bookingTotals.set(booking.id, current)
    }

    const bookings = Array.from(bookingTotals.values())
    const totalRevenue = asCurrency(bookings.reduce((sum, row) => sum + row.revenue, 0))
    const totalRefunds = asCurrency(bookings.reduce((sum, row) => sum + row.refund, 0))
    const netRevenue = asCurrency(totalRevenue - totalRefunds)
    const paidBookings = bookings.filter(row => row.revenue > 0).length
    const refundedBookings = bookings.filter(row => row.refund > 0).length

    return NextResponse.json({
      range: { start: start.toISOString(), end: end.toISOString() },
      summary: {
        totalRevenue,
        totalRefunds,
        netRevenue,
        paidBookings,
        refundedBookings,
        averageBookingValue: paidBookings ? asCurrency(totalRevenue / paidBookings) : 0,
      },
      segments: {
        bySchool: toRows(bySchool),
        byRoute: toRows(byRoute, 12),
        byDate: toRows(byDate).sort((a, b) => a.key.localeCompare(b.key)),
        byPaymentMethod: toRows(byPaymentMethod),
      },
    })
  } catch (error) {
    console.error("Admin finance dashboard error", error)
    return NextResponse.json({ error: "Failed to load finance dashboard" }, { status: 500 })
  }
}
