"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Loader2, LayoutList, LayoutGrid, Bus, User, Calendar, Clock, MapPin,
  XCircle, CheckCircle, AlertCircle, RefreshCw, Filter
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

interface BookingItem {
  id: string
  seatNumber: number
  direction: string
  tripDate: string
  price: number
  status: string
  schedule?: {
    routeName: string
    departureTime: string
    school?: { name: string }
    vehicle?: { regPlate: string; type: string }
    driver?: { user: { name?: string } }
  }
  pupil?: { fullName: string; yearLevel?: string }
}

interface Booking {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  cancelReason?: string
  cancelledAt?: string
  refundedAt?: string
  refundable?: boolean
  items: BookingItem[]
  payment?: { status: string; paidAt?: string }
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
}

const STATUS_ICONS: Record<string, any> = {
  CONFIRMED: CheckCircle,
  CANCELLED: XCircle,
  REFUNDED: RefreshCw,
}

export default function BookingHistoryPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"list" | "card">("list")
  const [statusFilter, setStatusFilter] = useState("__all__")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)

  const fetchBookings = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== "__all__") params.set("status", statusFilter)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)

    fetch(`/api/parent/bookings?${params}`)
      .then(r => r.json())
      .then(data => { setBookings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, [statusFilter, dateFrom, dateTo])

  const handleCancel = async () => {
    if (!selectedBooking || !cancelReason.trim()) {
      toast.error("Please provide a cancellation reason")
      return
    }
    setCancelling(true)
    const res = await fetch(`/api/parent/bookings/${selectedBooking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", reason: cancelReason }),
    })
    setCancelling(false)
    if (res.ok) {
      const data = await res.json()
      toast.success(data.message || "Booking cancelled")
      setShowCancelDialog(false)
      setShowDetail(false)
      setCancelReason("")
      fetchBookings()
    } else {
      const d = await res.json()
      toast.error(d.error || "Failed to cancel booking")
    }
  }

  // Check if a booking is cancellable and refundable
  const getRefundStatus = (booking: Booking) => {
    const firstItem = booking.items[0]
    if (!firstItem) return { cancellable: false, refundable: false }
    const hoursUntil = (new Date(firstItem.tripDate).getTime() - Date.now()) / (1000 * 60 * 60)
    return {
      cancellable: ["CONFIRMED", "PENDING"].includes(booking.status),
      refundable: hoursUntil > 5,
      hoursUntil: Math.round(hoursUntil),
    }
  }

  const DirectionBadge = ({ direction }: { direction: string }) => (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
      direction === "HOME_TO_SCHOOL" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
    }`}>
      {direction === "HOME_TO_SCHOOL" ? "→ School" : "→ Home"}
    </span>
  )

  return (
    <DashboardLayout title="My Bookings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h1 className="text-xl font-bold">Booking History</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} found</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowFilters(f => !f)}>
              <Filter className="h-4 w-4" /> Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setView(v => v === "list" ? "card" : "list")}>
              {view === "list" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </Button>
            <Link href="/parent/book">
              <Button size="sm">+ Book Transport</Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="All statuses" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="REFUNDED">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date from</Label>
                  <Input type="date" className="h-9" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Date to</Label>
                  <Input type="date" className="h-9" value={dateTo} onChange={e => setDateTo(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter(""); setDateFrom(""); setDateTo("") }}>
                  Clear filters
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "All", count: bookings.length, status: "" },
            { label: "Confirmed", count: bookings.filter(b => b.status === "CONFIRMED").length, status: "CONFIRMED" },
            { label: "Cancelled", count: bookings.filter(b => b.status === "CANCELLED").length, status: "CANCELLED" },
            { label: "Refunded", count: bookings.filter(b => b.status === "REFUNDED").length, status: "REFUNDED" },
          ].map(stat => (
            <button key={stat.label} onClick={() => setStatusFilter(stat.status)}
              className={`p-3 rounded-lg border text-left transition-colors ${statusFilter === stat.status ? "border-black bg-black text-white" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600"}`}>
              <p className={`text-2xl font-bold ${statusFilter === stat.status ? "text-white" : "text-gray-900"}`}>{stat.count}</p>
              <p className={`text-xs mt-0.5 ${statusFilter === stat.status ? "text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : bookings.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Bus className="h-12 w-12 text-gray-200 mx-auto" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">No bookings found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {(statusFilter && statusFilter !== "__all__") || dateFrom || dateTo ? "Try adjusting your filters." : "You haven't made any bookings yet."}
              </p>
              <Link href="/parent/book">
                <Button>Book Transport</Button>
              </Link>
            </CardContent>
          </Card>
        ) : view === "list" ? (
          <div className="space-y-3">
            {bookings.map(booking => {
              const { cancellable, refundable } = getRefundStatus(booking)
              const Icon = STATUS_ICONS[booking.status] || CheckCircle
              return (
                <Card key={booking.id} className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => { setSelectedBooking(booking); setShowDetail(true) }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        booking.status === "CONFIRMED" ? "bg-green-100" :
                        booking.status === "CANCELLED" ? "bg-red-100" :
                        booking.status === "REFUNDED" ? "bg-purple-100" : "bg-yellow-100"
                      }`}>
                        <Icon className={`h-4 w-4 ${
                          booking.status === "CONFIRMED" ? "text-green-600" :
                          booking.status === "CANCELLED" ? "text-red-600" :
                          booking.status === "REFUNDED" ? "text-purple-600" : "text-yellow-600"
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm">
                              {booking.items.length === 1
                                ? booking.items[0].schedule?.routeName
                                : `${booking.items.length} trips`}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {booking.items.slice(0, 3).map(item => (
                                <span key={item.id} className="text-xs text-gray-500 dark:text-gray-400">
                                  {item.pupil?.fullName} (Seat {item.seatNumber})
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold">£{booking.totalAmount.toFixed(2)}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}>
                              {booking.status}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {booking.items[0] && (
                            <>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(booking.items[0].tripDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                              {booking.items[0].schedule?.school && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.items[0].schedule.school.name}
                                </span>
                              )}
                            </>
                          )}
                          <span>{new Date(booking.createdAt).toLocaleDateString("en-GB")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map(booking => (
              <Card key={booking.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedBooking(booking); setShowDetail(true) }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}>
                      {booking.status}
                    </span>
                    <span className="font-bold">£{booking.totalAmount.toFixed(2)}</span>
                  </div>

                  {booking.items.slice(0, 2).map(item => (
                    <div key={item.id} className="text-sm space-y-0.5">
                      <p className="font-medium">{item.pupil?.fullName}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">{item.schedule?.routeName} · Seat {item.seatNumber}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {new Date(item.tripDate).toLocaleDateString("en-GB")} · <DirectionBadge direction={item.direction} />
                      </p>
                    </div>
                  ))}
                  {booking.items.length > 2 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">+{booking.items.length - 2} more trips</p>
                  )}

                  <p className="text-xs text-gray-400 pt-2 border-t">
                    Booked {new Date(booking.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Booking Detail Dialog */}
      {selectedBooking && (
        <Dialog open={showDetail} onOpenChange={setShowDetail}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Status badge */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-gray-400 dark:text-gray-500">{selectedBooking.id}</span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[selectedBooking.status] || "bg-gray-100"}`}>
                  {selectedBooking.status}
                </span>
              </div>

              {/* Trip items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Trips</p>
                <div className="space-y-2">
                  {selectedBooking.items.map(item => (
                    <div key={item.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{item.pupil?.fullName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.schedule?.routeName} · Seat {item.seatNumber}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(item.tripDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                            {' '}at{' '}{item.schedule?.departureTime}
                          </p>
                          {item.schedule?.school && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">📍 {item.schedule.school.name}</p>
                          )}
                          <div className="mt-1"><DirectionBadge direction={item.direction} /></div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{item.price > 0 ? `£${item.price.toFixed(2)}` : "Free"}</p>
                          {item.schedule?.vehicle && (
                            <p className="text-xs text-gray-400 dark:text-gray-500">{item.schedule.vehicle.regPlate}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total</span>
                <span>£{selectedBooking.totalAmount.toFixed(2)}</span>
              </div>

              {/* Payment info */}
              {selectedBooking.payment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                  <p className="font-medium">Payment: {selectedBooking.payment.status}</p>
                  {selectedBooking.payment.paidAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Paid: {new Date(selectedBooking.payment.paidAt).toLocaleString("en-GB")}</p>
                  )}
                </div>
              )}

              {/* Cancellation info */}
              {selectedBooking.cancelReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs font-medium text-red-700">Cancelled</p>
                  <p className="text-sm">{selectedBooking.cancelReason}</p>
                  {selectedBooking.cancelledAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(selectedBooking.cancelledAt).toLocaleString("en-GB")}</p>
                  )}
                  {selectedBooking.refundedAt && (
                    <p className="text-xs text-green-600 mt-1">✓ Refund processed: {new Date(selectedBooking.refundedAt).toLocaleString("en-GB")}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              {(() => {
                const { cancellable, refundable, hoursUntil } = getRefundStatus(selectedBooking)
                if (!cancellable) return null
                return (
                  <div className="space-y-2">
                    <div className={`p-2 rounded text-xs ${refundable ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                      {refundable
                        ? `✓ Full refund available (${hoursUntil}h until departure)`
                        : `⚠ No refund available (less than 5 hours until departure)`}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowCancelDialog(true)}
                    >
                      <XCircle className="h-4 w-4" /> Cancel Booking
                    </Button>
                  </div>
                )
              })()}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cancel Booking</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedBooking && (() => {
              const { refundable, hoursUntil } = getRefundStatus(selectedBooking)
              return (
                <div className={`p-3 rounded-lg border text-sm ${refundable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  {refundable ? (
                    <p className="text-green-800">
                      ✓ <strong>Full refund</strong> of £{selectedBooking.totalAmount.toFixed(2)} will be processed (cancellation {hoursUntil}h before departure).
                    </p>
                  ) : (
                    <p className="text-red-800">
                      ⚠ <strong>No refund</strong> – cancellation is within 5 hours of departure.
                    </p>
                  )}
                </div>
              )
            })()}

            <div className="space-y-2">
              <Label>Reason for cancellation *</Label>
              <Input
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="Please explain why you're cancelling..."
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowCancelDialog(false)}>Keep Booking</Button>
              <Button variant="destructive" onClick={handleCancel} disabled={cancelling || !cancelReason.trim()}>
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
