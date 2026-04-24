"use client"
import { useState, useEffect } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search, Bus, Clock, MapPin, Users, ShoppingCart, CheckCircle2,
  AlertCircle, Loader2, ChevronRight, ArrowRight
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"

interface SearchResult {
  id: string
  routeName: string
  serviceType: string
  direction: string
  departureTime: string
  arrivalTime?: string
  pickupPostcode?: string
  dropoffPostcode?: string
  pricePerSeat: number
  availableSeats: number
  totalSeats: number
  bookedSeats: number[]
  school?: { id: string; name: string; address: string }
  vehicle?: { id: string; regPlate: string; type: string; model?: string; make?: string; seats: number }
  driver?: { user: { name?: string } }
}

interface Pupil {
  id: string
  fullName: string
  yearLevel?: string
  schoolId?: string
  school?: { name: string }
}

const SEAT_COLS = 4

export default function BookTransportPage() {
  const router = useRouter()
  const [step, setStep] = useState<"search" | "vehicle" | "seat" | "confirm">("search")
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [pupils, setPupils] = useState<Pupil[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [basketCount, setBasketCount] = useState(0)
  const [adding, setAdding] = useState(false)

  // Search form
  const [searchForm, setSearchForm] = useState({
    postcode: "", schoolId: "", serviceType: "", date: "", time: ""
  })

  // Selected items
  const [selectedSchedule, setSelectedSchedule] = useState<SearchResult | null>(null)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [selectedPupil, setSelectedPupil] = useState<string>("")
  const [selectedDirection, setSelectedDirection] = useState<string>("HOME_TO_SCHOOL")

  useEffect(() => {
    Promise.all([
      fetch("/api/parent/pupils").then(r => r.json()),
      fetch("/api/admin/schools").then(r => r.json()),
      fetch("/api/parent/basket").then(r => r.json()),
    ]).then(([p, s, basket]) => {
      setPupils(Array.isArray(p) ? p : [])
      setSchools(Array.isArray(s) ? s : [])
      setBasketCount(Array.isArray(basket) ? basket.length : 0)
    }).catch(() => {})
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchForm.postcode && !searchForm.schoolId) {
      toast.error("Please enter a postcode or select a school")
      return
    }
    setSearching(true)
    const params = new URLSearchParams()
    if (searchForm.postcode) params.set("postcode", searchForm.postcode)
    if (searchForm.schoolId) params.set("schoolId", searchForm.schoolId)
    if (searchForm.serviceType) params.set("serviceType", searchForm.serviceType)
    if (searchForm.date) params.set("date", searchForm.date)
    if (searchForm.time) params.set("time", searchForm.time)

    const res = await fetch(`/api/parent/search?${params}`)
    const data = await res.json()
    setSearching(false)
    if (Array.isArray(data)) {
      setResults(data)
      setStep("vehicle")
    } else {
      toast.error(data.error || "Search failed")
    }
  }

  const handleSelectVehicle = (schedule: SearchResult) => {
    setSelectedSchedule(schedule)
    setSelectedSeat(null)
    setSelectedPupil("")
    setSelectedDirection(schedule.direction === "SCHOOL_TO_HOME" ? "SCHOOL_TO_HOME" : "HOME_TO_SCHOOL")
    setStep("seat")
  }

  const handleAddToBasket = async () => {
    if (!selectedSchedule || !selectedSeat || !selectedPupil || !searchForm.date) {
      toast.error("Please complete all selections")
      return
    }
    setAdding(true)
    const res = await fetch("/api/parent/basket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleId: selectedSchedule.id,
        pupilId: selectedPupil,
        seatNumber: selectedSeat,
        direction: selectedDirection,
        tripDate: searchForm.date,
        price: selectedSchedule.pricePerSeat,
      }),
    })
    setAdding(false)
    if (res.ok) {
      toast.success("Added to basket!")
      setBasketCount(c => c + 1)
      setStep("confirm")
    } else {
      const d = await res.json()
      toast.error(d.error || "Failed to add to basket")
    }
  }

  const SeatMap = ({ schedule }: { schedule: SearchResult }) => {
    const totalSeats = schedule.totalSeats
    const rows = Math.ceil(totalSeats / SEAT_COLS)

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-gray-200" /><span>Available</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-gray-700" /><span>Taken</span></div>
          <div className="flex items-center gap-1"><div className="w-4 h-4 rounded bg-black" /><span>Selected</span></div>
        </div>

        {/* Driver area */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-t-xl p-2 text-center text-xs text-gray-400 dark:text-gray-500">
          🚌 Driver
        </div>

        {/* Seats grid */}
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${SEAT_COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: totalSeats }, (_, i) => {
            const seatNum = i + 1
            const isTaken = schedule.bookedSeats.includes(seatNum)
            const isSelected = selectedSeat === seatNum
            return (
              <button
                key={seatNum}
                type="button"
                disabled={isTaken}
                onClick={() => setSelectedSeat(seatNum)}
                className={`
                  h-10 rounded-lg text-sm font-medium transition-all border-2
                  ${isTaken
                    ? "bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed"
                    : isSelected
                      ? "bg-black text-white border-black shadow-lg scale-105"
                      : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }
                `}
              >
                {seatNum}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout title="Book Transport">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Basket shortcut */}
        <div className="flex justify-end">
          <Link href="/parent/basket">
            <Button variant="secondary" size="sm" className="relative">
              <ShoppingCart className="h-4 w-4" />
              Basket
              {basketCount > 0 && (
                <span className="ml-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {basketCount}
                </span>
              )}
            </Button>
          </Link>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-sm">
          {[
            { key: "search", label: "Search" },
            { key: "vehicle", label: "Select Route" },
            { key: "seat", label: "Choose Seat" },
            { key: "confirm", label: "Added" },
          ].map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                ${step === s.key ? "bg-black text-white" :
                  ["vehicle", "seat", "confirm"].indexOf(step) > ["search", "vehicle", "seat", "confirm"].indexOf(s.key)
                    ? "bg-gray-800 text-white"
                    : "bg-gray-100 text-gray-400 dark:text-gray-500"}`}>
                {i + 1}
              </div>
              <span className={`hidden sm:inline ${step === s.key ? "font-semibold" : "text-gray-400"}`}>{s.label}</span>
              {i < 3 && <ChevronRight className="h-4 w-4 text-gray-300" />}
            </div>
          ))}
        </div>

        {/* Step 1: Search */}
        {step === "search" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" /> Find Available Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Your Postcode</Label>
                    <Input value={searchForm.postcode}
                      onChange={e => setSearchForm(p => ({ ...p, postcode: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SW1A 1AA" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">We'll find routes covering your area</p>
                  </div>
                  <div className="space-y-1">
                    <Label>School</Label>
                    <Select value={searchForm.schoolId || "__any__"} onValueChange={v => setSearchForm(p => ({ ...p, schoolId: v === "__any__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any school</SelectItem>
                        {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Trip Type</Label>
                    <Select value={searchForm.serviceType || "__any__"} onValueChange={v => setSearchForm(p => ({ ...p, serviceType: v === "__any__" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Any type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__any__">Any</SelectItem>
                        <SelectItem value="PICKUP">Morning Pick-up</SelectItem>
                        <SelectItem value="DROPOFF">Afternoon Drop-off</SelectItem>
                        <SelectItem value="BOTH">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Date *</Label>
                    <Input type="date" value={searchForm.date}
                      onChange={e => setSearchForm(p => ({ ...p, date: e.target.value }))}
                      min={new Date().toISOString().split("T")[0]} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Preferred Time</Label>
                    <Input type="time" value={searchForm.time}
                      onChange={e => setSearchForm(p => ({ ...p, time: e.target.value }))} />
                    <p className="text-xs text-gray-400 dark:text-gray-500">Shows routes within ±1 hour</p>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={searching}>
                  {searching ? <><Loader2 className="h-4 w-4 animate-spin" /> Searching...</> : <><Search className="h-4 w-4" /> Search Routes</>}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Vehicle */}
        {step === "vehicle" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                {results.length} route{results.length !== 1 ? "s" : ""} available
                {searchForm.date && ` on ${new Date(searchForm.date).toLocaleDateString("en-GB")}`}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setStep("search")}>
                ← Back to search
              </Button>
            </div>

            {results.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center space-y-2">
                  <AlertCircle className="h-10 w-10 text-gray-400 mx-auto" />
                  <p className="font-medium text-gray-700 dark:text-gray-300">No routes available</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Try a different date, postcode, or school.</p>
                  <Button variant="secondary" onClick={() => setStep("search")}>Modify Search</Button>
                </CardContent>
              </Card>
            ) : (
              results.map(schedule => (
                <Card key={schedule.id} className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-black"
                  onClick={() => handleSelectVehicle(schedule)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Bus className="h-4 w-4" />
                          <h3 className="font-semibold">{schedule.routeName}</h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:text-gray-400">
                            {schedule.vehicle?.type}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" /> {schedule.departureTime}
                            {schedule.arrivalTime && ` → ${schedule.arrivalTime}`}
                          </span>
                          {schedule.school && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> {schedule.school.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            {schedule.availableSeats} seat{schedule.availableSeats !== 1 ? "s" : ""} left
                          </span>
                        </div>
                        {(schedule.pickupPostcode || schedule.dropoffPostcode) && (
                          <div className="flex gap-3 text-xs text-gray-500 dark:text-gray-400">
                            {schedule.pickupPostcode && <span>📍 Pick-up: {schedule.pickupPostcode}</span>}
                            {schedule.dropoffPostcode && <span>🏫 Drop-off: {schedule.dropoffPostcode}</span>}
                          </div>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold">
                          {schedule.pricePerSeat > 0 ? `£${schedule.pricePerSeat.toFixed(2)}` : "Free"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">per seat</p>
                        <div className="mt-2">
                          <div className="w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                            <div className="h-full bg-black rounded-full"
                              style={{ width: `${Math.min(((schedule.totalSeats - schedule.availableSeats) / schedule.totalSeats) * 100, 100)}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{schedule.availableSeats}/{schedule.totalSeats} available</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {schedule.vehicle?.make} {schedule.vehicle?.model} · {schedule.vehicle?.regPlate}
                        {schedule.driver?.user?.name && ` · Driver: ${schedule.driver.user.name}`}
                      </span>
                      <Button size="sm" onClick={() => handleSelectVehicle(schedule)}>
                        Select <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Step 3: Choose Seat */}
        {step === "seat" && selectedSchedule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Choose Your Seat</h2>
              <Button variant="ghost" size="sm" onClick={() => setStep("vehicle")}>
                ← Back to routes
              </Button>
            </div>

            {/* Route summary */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{selectedSchedule.routeName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedSchedule.departureTime} · {selectedSchedule.vehicle?.regPlate}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(searchForm.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xl font-bold">
                      {selectedSchedule.pricePerSeat > 0 ? `£${selectedSchedule.pricePerSeat.toFixed(2)}` : "Free"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Seat map */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Seat Map</CardTitle>
                </CardHeader>
                <CardContent>
                  <SeatMap schedule={selectedSchedule} />
                  {selectedSeat && (
                    <p className="mt-3 text-center font-medium">
                      Seat {selectedSeat} selected ✓
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Assignment details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Assign Pupil *</Label>
                  <Select value={selectedPupil} onValueChange={setSelectedPupil}>
                    <SelectTrigger><SelectValue placeholder="Select pupil" /></SelectTrigger>
                    <SelectContent>
                      {pupils.length === 0 ? (
                        <SelectItem value="__empty__" disabled>No pupils registered</SelectItem>
                      ) : pupils.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.fullName} {p.yearLevel ? `(Yr ${p.yearLevel})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {pupils.length === 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      <Link href="/parent/children" className="underline">Add a pupil</Link> first
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Select value={selectedDirection} onValueChange={setSelectedDirection}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {selectedSchedule.serviceType !== "DROPOFF" && (
                        <SelectItem value="HOME_TO_SCHOOL">Morning: Home → School</SelectItem>
                      )}
                      {selectedSchedule.serviceType !== "PICKUP" && (
                        <SelectItem value="SCHOOL_TO_HOME">Afternoon: School → Home</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1 text-sm">
                  <p className="font-medium">Booking Summary</p>
                  <p className="text-gray-600 dark:text-gray-400">Date: {searchForm.date ? new Date(searchForm.date).toLocaleDateString("en-GB") : "—"}</p>
                  <p className="text-gray-600 dark:text-gray-400">Seat: {selectedSeat ? `#${selectedSeat}` : "Not selected"}</p>
                  <p className="text-gray-600 dark:text-gray-400">Pupil: {pupils.find(p => p.id === selectedPupil)?.fullName || "Not selected"}</p>
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Price:</span>
                    <span>{selectedSchedule.pricePerSeat > 0 ? `£${selectedSchedule.pricePerSeat.toFixed(2)}` : "Free"}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedSeat || !selectedPupil || adding}
                  onClick={handleAddToBasket}
                >
                  {adding ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</>
                    : <><ShoppingCart className="h-4 w-4" /> Add to Basket</>}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirm added */}
        {step === "confirm" && (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold">Added to Basket!</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Your trip has been added. You can continue adding trips or proceed to checkout.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={() => { setStep("search"); setResults([]); setSelectedSchedule(null) }}>
                  Add Another Trip
                </Button>
                <Link href="/parent/basket">
                  <Button>
                    <ShoppingCart className="h-4 w-4" />
                    Go to Basket ({basketCount})
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
