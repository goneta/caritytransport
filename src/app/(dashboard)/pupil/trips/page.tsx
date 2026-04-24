"use client"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Bus, Calendar, Clock, MapPin, Navigation, Loader2, Filter, User
} from "lucide-react"

interface TripLog {
  id: string
  timestamp: string
  eventType: string
  status: string
  notes?: string
  schedule?: { routeName: string; direction: string }
  driver?: { user: { name?: string; phone?: string | null } }
  vehicle?: { regPlate: string }
}

interface BookingItem {
  id: string
  tripDate: string
  direction: string
  status: string
  seatNumber: number
  price: number
  schedule?: {
    routeName: string
    departureTime: string
    school?: { name: string }
    driver?: { user: { name?: string; phone?: string | null } }
    vehicle?: { regPlate: string }
  }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  COMPLETED: "bg-gray-100 text-gray-600 dark:text-gray-400",
  CANCELLED: "bg-red-100 text-red-700",
  BOARDED: "bg-blue-100 text-blue-700",
  BOARDING: "bg-blue-100 text-blue-700",
  BOARDING_DENIED: "bg-red-100 text-red-700",
}

export default function PupilTripsPage() {
  const [upcomingTrips, setUpcomingTrips] = useState<BookingItem[]>([])
  const [tripHistory, setTripHistory] = useState<TripLog[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"upcoming" | "history">("upcoming")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("__all__")

  useEffect(() => {
    fetch("/api/pupil/dashboard")
      .then(r => r.json())
      .then(data => {
        setUpcomingTrips(Array.isArray(data.upcomingTrips) ? data.upcomingTrips : [])
        setTripHistory(Array.isArray(data.tripHistory) ? data.tripHistory : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filteredHistory = tripHistory.filter(t => {
    const matchesSearch = !search ||
      t.schedule?.routeName?.toLowerCase().includes(search.toLowerCase()) ||
      t.driver?.user?.name?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "__all__" || t.status === statusFilter || t.eventType === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredUpcoming = upcomingTrips.filter(t => {
    const matchesSearch = !search ||
      t.schedule?.routeName?.toLowerCase().includes(search.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Trips</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">View your upcoming and past transport trips</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        {[
          { key: "upcoming" as const, label: `Upcoming (${upcomingTrips.length})` },
          { key: "history" as const, label: `Trip History (${tripHistory.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSearch(""); setStatusFilter("") }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              tab === t.key ? "bg-white dark:bg-gray-800 shadow-sm text-black dark:text-white" : "text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Filter className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <Input
            className="pl-9"
            placeholder={tab === "upcoming" ? "Search routes..." : "Search routes or drivers..."}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {tab === "history" && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All</SelectItem>
              <SelectItem value="BOARDING">Boarded</SelectItem>
              <SelectItem value="BOARDING_DENIED">Denied</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
        </div>
      ) : tab === "upcoming" ? (
        <div className="space-y-3">
          {filteredUpcoming.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <Bus className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="font-medium text-gray-600 dark:text-gray-400">No upcoming trips</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {search ? "Try adjusting your search" : "Your parent will need to book transport for you"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredUpcoming.map(trip => (
              <Card key={trip.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center flex-shrink-0">
                      <Bus className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{trip.schedule?.routeName || "Unknown Route"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Seat {trip.seatNumber} ·{" "}
                            {trip.direction === "HOME_TO_SCHOOL" ? "→ School (Morning)" : "→ Home (Afternoon)"}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[trip.status] || "bg-gray-100 text-gray-600 dark:text-gray-400"}>
                          {trip.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(trip.tripDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                        </span>
                        {trip.schedule?.departureTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {trip.schedule.departureTime}
                          </span>
                        )}
                        {trip.schedule?.school && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {trip.schedule.school.name}
                          </span>
                        )}
                      </div>

                      {trip.schedule?.driver?.user?.name && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <User className="h-3 w-3" />
                          Driver: {trip.schedule.driver.user.name}
                          {trip.schedule.driver.user.phone && (
                            <a href={`tel:${trip.schedule.driver.user.phone}`}
                              className="text-blue-600 underline">
                              {trip.schedule.driver.user.phone}
                            </a>
                          )}
                        </div>
                      )}

                      {trip.schedule?.vehicle && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Vehicle: {trip.schedule.vehicle.regPlate}
                        </p>
                      )}

                      {trip.price > 0 && (
                        <p className="text-sm font-medium">£{trip.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center space-y-2">
                <Navigation className="h-10 w-10 text-gray-300 mx-auto" />
                <p className="font-medium text-gray-600 dark:text-gray-400">No trip history</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {search || (statusFilter && statusFilter !== "__all__") ? "Try adjusting your filters" : "Your trip history will appear here once you've travelled"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredHistory.map(trip => (
              <Card key={trip.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      trip.eventType === "BOARDING" || trip.status === "BOARDING"
                        ? "bg-blue-100"
                        : trip.eventType === "BOARDING_DENIED"
                        ? "bg-red-100"
                        : "bg-gray-100"
                    }`}>
                      <Navigation className={`h-5 w-5 ${
                        trip.eventType === "BOARDING" || trip.status === "BOARDING"
                          ? "text-blue-600"
                          : trip.eventType === "BOARDING_DENIED"
                          ? "text-red-600"
                          : "text-gray-600 dark:text-gray-400"
                      }`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{trip.schedule?.routeName || "Unknown Route"}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {trip.schedule?.direction === "HOME_TO_SCHOOL" ? "→ School" : "→ Home"}
                          </p>
                        </div>
                        <Badge className={STATUS_COLORS[trip.eventType || trip.status] || "bg-gray-100 text-gray-600 dark:text-gray-400"}>
                          {trip.eventType || trip.status}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(trip.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(trip.timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      {trip.driver?.user?.name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="h-3 w-3" /> Driver: {trip.driver.user.name}
                        </p>
                      )}

                      {trip.vehicle && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">Vehicle: {trip.vehicle.regPlate}</p>
                      )}

                      {trip.notes && (
                        <p className="text-xs text-gray-500 italic">{trip.notes}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
