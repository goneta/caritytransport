"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Search, Loader2, Download, LayoutGrid, LayoutList,
  Plus, Eye, RefreshCw, XCircle, CheckCircle, User, Bus, Calendar, MapPin
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
  pupil?: { fullName: string; studentNumber?: string; yearLevel?: string }
}

interface Booking {
  id: string
  status: string
  totalAmount: number
  createdAt: string
  cancelReason?: string
  refundedAt?: string
  user?: { name?: string; email?: string; phone?: string }
  items: BookingItem[]
  payment?: { status: string; paidAt?: string }
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  CANCELLED: "bg-red-100 text-red-800",
  REFUNDED: "bg-purple-100 text-purple-800",
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<"table" | "card">("table")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("__all__")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [showRefundDialog, setShowRefundDialog] = useState(false)
  const [refundReason, setRefundReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)

  // Admin direct booking
  const [showDirectBook, setShowDirectBook] = useState(false)
  const [schedules, setSchedules] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [pupils, setPupils] = useState<any[]>([])
  const [directForm, setDirectForm] = useState({
    userId: "", scheduleId: "", pupilId: "", seatNumber: 1,
    direction: "HOME_TO_SCHOOL", tripDate: "", price: 0,
  })
  const [bookingSeats, setBookingSeats] = useState<number[]>([])

  const fetchBookings = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== "__all__") params.set("status", statusFilter)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    if (search) params.set("pupil", search)

    fetch(`/api/admin/bookings?${params}`)
      .then(r => r.json())
      .then(data => { setBookings(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchBookings() }, [statusFilter, dateFrom, dateTo])

  const handleExportCSV = () => {
    const params = new URLSearchParams({ format: "csv" })
    if (statusFilter && statusFilter !== "__all__") params.set("status", statusFilter)
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    window.open(`/api/admin/bookings?${params}`, "_blank")
  }

  const handleAdminRefund = async () => {
    if (!selectedBooking || !refundReason) { toast.error("Reason required"); return }
    setActionLoading(true)
    const res = await fetch(`/api/admin/bookings/${selectedBooking.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refund", reason: refundReason }),
    })
    setActionLoading(false)
    if (res.ok) {
      toast.success("Refund processed successfully")
      setShowRefundDialog(false)
      setShowDetail(false)
      setRefundReason("")
      fetchBookings()
    } else {
      const d = await res.json()
      toast.error(d.error || "Failed to process refund")
    }
  }

  const fetchScheduleSeats = async (scheduleId: string, tripDate: string) => {
    if (!scheduleId || !tripDate) return
    const schedule = schedules.find(s => s.id === scheduleId)
    if (!schedule) return
    const totalSeats = schedule.vehicle?.seats || 0
    // Fetch taken seats for this date
    const res = await fetch(`/api/admin/bookings?scheduleId=${scheduleId}&dateFrom=${tripDate}&dateTo=${tripDate}`)
    const data = await res.json()
    const taken = Array.isArray(data)
      ? data.flatMap((b: any) => b.items.map((i: any) => i.seatNumber))
      : []
    const available = Array.from({ length: totalSeats }, (_, i) => i + 1).filter(s => !taken.includes(s))
    setBookingSeats(available)
  }

  const handleDirectBook = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    const res = await fetch("/api/admin/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(directForm),
    })
    setActionLoading(false)
    if (res.ok) {
      toast.success("Booking created successfully")
      setShowDirectBook(false)
      fetchBookings()
    } else {
      const d = await res.json()
      toast.error(d.error || "Failed to create booking")
    }
  }

  const loadDirectBookData = async () => {
    const [s, p] = await Promise.all([
      fetch("/api/admin/schedules").then(r => r.json()),
      fetch("/api/admin/parents").then(r => r.json()),
    ])
    setSchedules(Array.isArray(s) ? s : [])
    setParents(Array.isArray(p) ? p : [])
  }

  const handleParentChange = async (userId: string) => {
    setDirectForm(p => ({ ...p, userId, pupilId: "" }))
    const parent = parents.find(p => p.userId === userId)
    if (parent) {
      const res = await fetch(`/api/admin/parents/${parent.id}/pupils`)
      if (res.ok) { const data = await res.json(); setPupils(data) }
    }
  }

  const filteredBookings = bookings.filter(b => {
    if (!search) return true
    const name = b.user?.name?.toLowerCase() || ""
    const email = b.user?.email?.toLowerCase() || ""
    const pupilName = b.items.map(i => i.pupil?.fullName?.toLowerCase()).join(" ")
    const q = search.toLowerCase()
    return name.includes(q) || email.includes(q) || pupilName.includes(q) || b.id.includes(q)
  })

  return (
    <DashboardLayout title="Bookings Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input placeholder="Search bookings..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36" title="Date from" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36" title="Date to" />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setView(v => v === "table" ? "card" : "table")}>
              {view === "table" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={() => { loadDirectBookData(); setShowDirectBook(true) }}>
              <Plus className="h-4 w-4" /> Direct Book
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total", value: bookings.length, color: "text-black" },
            { label: "Confirmed", value: bookings.filter(b => b.status === "CONFIRMED").length, color: "text-green-700" },
            { label: "Cancelled", value: bookings.filter(b => b.status === "CANCELLED").length, color: "text-red-600" },
            { label: "Refunded", value: bookings.filter(b => b.status === "REFUNDED").length, color: "text-purple-700" },
          ].map(stat => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table View */}
        {view === "table" && (
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">No bookings found</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Pupils</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Trip Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map(booking => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-mono text-xs">{booking.id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{booking.user?.name || "—"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{booking.user?.email}</p>
                        </TableCell>
                        <TableCell>
                          {booking.items.slice(0, 2).map(item => (
                            <p key={item.id} className="text-xs">{item.pupil?.fullName} (Seat {item.seatNumber})</p>
                          ))}
                          {booking.items.length > 2 && <p className="text-xs text-gray-400 dark:text-gray-500">+{booking.items.length - 2} more</p>}
                        </TableCell>
                        <TableCell className="text-sm">{booking.items[0]?.schedule?.routeName || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {booking.items[0]?.tripDate
                            ? new Date(booking.items[0].tripDate).toLocaleDateString("en-GB")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm font-medium">£{booking.totalAmount.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}>
                            {booking.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedBooking(booking); setShowDetail(true) }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Card View */}
        {view === "card" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-3 flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filteredBookings.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-gray-500 dark:text-gray-400">No bookings found</div>
            ) : filteredBookings.map(booking => (
              <Card key={booking.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => { setSelectedBooking(booking); setShowDetail(true) }}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{booking.user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{booking.user?.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[booking.status] || "bg-gray-100"}`}>
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {booking.items.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <User className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                        <span>{item.pupil?.fullName} • Seat {item.seatNumber}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(booking.createdAt).toLocaleDateString("en-GB")}</span>
                    <span className="font-semibold">£{booking.totalAmount.toFixed(2)}</span>
                  </div>
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
              {/* Status & ID */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{selectedBooking.id}</span>
                <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[selectedBooking.status] || "bg-gray-100"}`}>
                  {selectedBooking.status}
                </span>
              </div>

              {/* Parent Info */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Parent / Guardian</p>
                <p className="font-medium">{selectedBooking.user?.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBooking.user?.email}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedBooking.user?.phone}</p>
              </div>

              {/* Booking Items */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Trip Items</p>
                <div className="space-y-2">
                  {selectedBooking.items.map(item => (
                    <div key={item.id} className="border rounded-lg p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{item.pupil?.fullName}</p>
                        <p className="font-semibold">£{item.price.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{item.schedule?.routeName} · {item.schedule?.vehicle?.regPlate}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Seat {item.seatNumber} · {item.direction === "HOME_TO_SCHOOL" ? "→ School" : "→ Home"}
                        · {new Date(item.tripDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between py-3 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold">£{selectedBooking.totalAmount.toFixed(2)}</span>
              </div>

              {/* Payment */}
              {selectedBooking.payment && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">Payment</p>
                  <p className="text-sm">Status: <span className="font-medium">{selectedBooking.payment.status}</span></p>
                  {selectedBooking.payment.paidAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">Paid: {new Date(selectedBooking.payment.paidAt).toLocaleString("en-GB")}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              {selectedBooking.status === "CONFIRMED" && (
                <div className="flex gap-2 justify-end">
                  <Button variant="destructive" size="sm" onClick={() => setShowRefundDialog(true)}>
                    <RefreshCw className="h-4 w-4" /> Override Refund
                  </Button>
                </div>
              )}

              {selectedBooking.cancelReason && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                  <p className="text-xs font-medium text-red-700">Cancellation Reason</p>
                  <p className="text-sm">{selectedBooking.cancelReason}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Admin Override Refund Dialog */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Process Admin Refund Override</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This will process a full refund for this booking, overriding the standard cancellation policy.
            </p>
            <div className="space-y-2">
              <Label>Reason for Override *</Label>
              <Input value={refundReason} onChange={e => setRefundReason(e.target.value)}
                placeholder="e.g. Vehicle breakdown, admin error..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setShowRefundDialog(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleAdminRefund} disabled={actionLoading || !refundReason}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Process Refund"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Booking Dialog */}
      <Dialog open={showDirectBook} onOpenChange={setShowDirectBook}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Direct Booking</DialogTitle></DialogHeader>
          <form onSubmit={handleDirectBook} className="space-y-4">
            <div className="space-y-1">
              <Label>Parent *</Label>
              <Select value={directForm.userId} onValueChange={handleParentChange}>
                <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                <SelectContent>
                  {parents.map((p: any) => (
                    <SelectItem key={p.userId} value={p.userId}>{p.user?.name} ({p.user?.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Pupil *</Label>
              <Select value={directForm.pupilId} onValueChange={v => setDirectForm(p => ({ ...p, pupilId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select pupil" /></SelectTrigger>
                <SelectContent>
                  {pupils.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.fullName} ({p.yearLevel})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Route *</Label>
              <Select value={directForm.scheduleId} onValueChange={v => {
                const sched = schedules.find(s => s.id === v)
                setDirectForm(p => ({ ...p, scheduleId: v, price: sched?.pricePerSeat || 0 }))
                if (v && directForm.tripDate) fetchScheduleSeats(v, directForm.tripDate)
              }}>
                <SelectTrigger><SelectValue placeholder="Select route" /></SelectTrigger>
                <SelectContent>
                  {schedules.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.routeName} ({s.departureTime})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Trip Date *</Label>
                <Input type="date" value={directForm.tripDate} onChange={e => {
                  setDirectForm(p => ({ ...p, tripDate: e.target.value }))
                  if (directForm.scheduleId) fetchScheduleSeats(directForm.scheduleId, e.target.value)
                }} required />
              </div>
              <div className="space-y-1">
                <Label>Direction *</Label>
                <Select value={directForm.direction} onValueChange={v => setDirectForm(p => ({ ...p, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME_TO_SCHOOL">→ School</SelectItem>
                    <SelectItem value="SCHOOL_TO_HOME">→ Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Seat Number *</Label>
                <Select value={String(directForm.seatNumber)} onValueChange={v => setDirectForm(p => ({ ...p, seatNumber: parseInt(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Select seat" /></SelectTrigger>
                  <SelectContent>
                    {bookingSeats.length > 0
                      ? bookingSeats.map(s => <SelectItem key={s} value={String(s)}>Seat {s}</SelectItem>)
                      : Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>Seat {i + 1}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Price (£)</Label>
                <Input type="number" step="0.01" min="0" value={directForm.price}
                  onChange={e => setDirectForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={() => setShowDirectBook(false)}>Cancel</Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
