"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  ShoppingCart, Trash2, Bus, Clock, MapPin, User, Calendar,
  CreditCard, Loader2, CheckCircle2, AlertCircle, ArrowRight, Lock
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface BasketItem {
  id: string
  seatNumber: number
  direction: string
  tripDate: string
  price: number
  schedule?: {
    id: string
    routeName: string
    departureTime: string
    school?: { name: string }
    vehicle?: { regPlate: string; type: string; model?: string }
    driver?: { user: { name?: string } }
  }
  pupil?: { fullName: string; studentNumber?: string }
}

export default function BasketPage() {
  const router = useRouter()
  const [items, setItems] = useState<BasketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState(false)
  const [showPayDialog, setShowPayDialog] = useState(false)
  const [payStep, setPayStep] = useState<"review" | "processing" | "success" | "error">("review")
  const [conflicts, setConflicts] = useState<string[]>([])
  const [bookingId, setBookingId] = useState("")

  const fetchBasket = async () => {
    try {
      const res = await fetch("/api/parent/basket")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { fetchBasket() }, [])

  const handleRemove = async (itemId: string) => {
    setRemoving(itemId)
    const res = await fetch(`/api/parent/basket?id=${itemId}`, { method: "DELETE" })
    setRemoving(null)
    if (res.ok) {
      setItems(items => items.filter(i => i.id !== itemId))
      toast.success("Removed from basket")
    } else {
      toast.error("Failed to remove item")
    }
  }

  const handleCheckout = async () => {
    setShowPayDialog(true)
    setPayStep("review")
    setConflicts([])
  }

  const handleConfirmPayment = async () => {
    setPayStep("processing")
    setCheckingOut(true)

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    const data = await res.json()
    setCheckingOut(false)

    if (res.ok) {
      setBookingId(data.bookingId)
      setPayStep("success")
      setItems([]) // Clear local basket
    } else if (res.status === 409 && data.conflicts) {
      setConflicts(data.conflicts)
      setPayStep("error")
    } else {
      toast.error(data.error || "Checkout failed")
      setPayStep("error")
    }
  }

  const total = items.reduce((sum, item) => sum + item.price, 0)

  const DirectionBadge = ({ direction }: { direction: string }) => (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
      direction === "HOME_TO_SCHOOL"
        ? "bg-blue-50 text-blue-700"
        : "bg-purple-50 text-purple-700"
    }`}>
      {direction === "HOME_TO_SCHOOL" ? "→ School" : "→ Home"}
    </span>
  )

  return (
    <DashboardLayout title="Basket">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-6 w-6" />
            Your Basket
          </h1>
          <Link href="/parent/book">
            <Button variant="secondary" size="sm">+ Add More Trips</Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto" />
              <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">Your basket is empty</p>
              <p className="text-gray-500 dark:text-gray-400">Search and add transport trips to your basket.</p>
              <Link href="/parent/book">
                <Button>Find Transport</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Items */}
            {items.map(item => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bus className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{item.schedule?.routeName}</p>
                        <p className="font-bold text-lg flex-shrink-0">
                          {item.price > 0 ? `£${item.price.toFixed(2)}` : "Free"}
                        </p>
                      </div>

                      <div className="mt-2 grid sm:grid-cols-2 gap-1 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          {item.pupil?.fullName} · Seat {item.seatNumber}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(item.tripDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {item.schedule?.departureTime}
                        </span>
                        {item.schedule?.vehicle && (
                          <span className="flex items-center gap-1.5">
                            <Bus className="h-3.5 w-3.5" />
                            {item.schedule.vehicle.regPlate} ({item.schedule.vehicle.type})
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <DirectionBadge direction={item.direction} />
                        {item.schedule?.school && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {item.schedule.school.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(item.id)}
                      disabled={removing === item.id}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
                    >
                      {removing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Order summary */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.pupil?.fullName} – {new Date(item.tripDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} (Seat {item.seatNumber})
                      </span>
                      <span>{item.price > 0 ? `£${item.price.toFixed(2)}` : "Free"}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>£{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkout button */}
            <div className="space-y-3">
              <Button className="w-full h-12 text-base" onClick={handleCheckout}>
                <Lock className="h-4 w-4" />
                Proceed to Payment · £{total.toFixed(2)}
              </Button>
              <p className="text-xs text-center text-gray-500 flex items-center justify-center gap-1">
                <Lock className="h-3 w-3" /> Secure payment powered by Stripe
              </p>
              <div className="text-xs text-center text-gray-400 space-y-0.5">
                <p>Seats are <strong>not held</strong> until payment is complete.</p>
                <p>Full refund available if cancelled more than 5 hours before departure.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPayDialog} onOpenChange={open => {
        if (!checkingOut) {
          setShowPayDialog(open)
          if (!open && payStep === "success") router.push("/parent/bookings")
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {payStep === "review" && "Review & Pay"}
              {payStep === "processing" && "Processing Payment..."}
              {payStep === "success" && "Payment Successful!"}
              {payStep === "error" && "Payment Issue"}
            </DialogTitle>
          </DialogHeader>

          {payStep === "review" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm border-b pb-2">
                    <div>
                      <p className="font-medium">{item.pupil?.fullName}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">
                        {item.schedule?.routeName} · Seat {item.seatNumber}
                        · {new Date(item.tripDate).toLocaleDateString("en-GB")}
                      </p>
                    </div>
                    <span className="font-medium">{item.price > 0 ? `£${item.price.toFixed(2)}` : "Free"}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span>£{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                <p className="font-medium">Important: Seat Availability</p>
                <p>Seats will be checked again at the time of payment. If a seat is taken, you'll need to select another.</p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <p>💳 Secure payment via Stripe</p>
                <p>✅ Instant confirmation email</p>
                <p>↩️ Full refund if cancelled 5+ hours before departure</p>
              </div>

              <Button className="w-full" onClick={handleConfirmPayment}>
                <CreditCard className="h-4 w-4" />
                Confirm & Pay £{total.toFixed(2)}
              </Button>
            </div>
          )}

          {payStep === "processing" && (
            <div className="py-8 text-center space-y-3">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-gray-400 dark:text-gray-500" />
              <p className="font-medium">Processing your payment...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Please don't close this window</p>
            </div>
          )}

          {payStep === "success" && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold">Booking Confirmed!</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your seats are confirmed. You'll receive a confirmation shortly.
              </p>
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500">Booking ID: {bookingId.slice(0, 8)}...</p>
              <Link href="/parent/bookings">
                <Button className="w-full">
                  View My Bookings <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}

          {payStep === "error" && (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              {conflicts.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium text-center">Seat Conflict Detected</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">The following seats were taken by someone else:</p>
                  <div className="space-y-1">
                    {conflicts.map((c, i) => (
                      <div key={i} className="p-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">{c}</div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center">Please go back and select different seats.</p>
                  <Button variant="secondary" className="w-full" onClick={() => {
                    setShowPayDialog(false)
                    fetchBasket()
                  }}>
                    Update Basket
                  </Button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="font-medium">Payment Failed</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Something went wrong. Please try again.</p>
                  <Button variant="secondary" className="w-full" onClick={() => setPayStep("review")}>
                    Try Again
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
