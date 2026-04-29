"use client"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Bus, Clock, CheckCircle, Loader2, Route, Navigation, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TrackingAssignment {
  id: string
  tripDate: string
  direction: string
  seatNumber: number
  pupil?: { id: string; fullName: string; pickupLocation?: string; pickupPostcode?: string }
  schedule?: {
    routeName: string
    departureTime: string
    arrivalTime?: string
    school?: { name: string; address?: string; postcode?: string }
    vehicle?: { regPlate: string; type: string; make?: string; model?: string; colour?: string }
    driver?: { user?: { name?: string; phone?: string } }
  }
  live?: {
    status: string
    updatedAt?: string | null
    isLive: boolean
    minutesSinceUpdate?: number | null
    location?: {
      latitude: number
      longitude: number
      timestamp: string
      status: string
      notes?: string
    } | null
    timeline: Array<{
      id: string
      status: string
      timestamp: string
      notes?: string
      latitude?: number | null
      longitude?: number | null
      pupilId?: string | null
    }>
  }
}

const STATUS_LABELS: Record<string, string> = {
  ROUTE_SCHEDULED: "Route scheduled",
  DEPARTED_DEPOT: "Vehicle departed depot",
  EN_ROUTE: "En route",
  ARRIVED_PICKUP: "Arrived at pickup point",
  BOARDED: "Pupil boarded",
  ARRIVED_SCHOOL: "Arrived at school",
  DROPPED: "Pupil dropped off",
  COMPLETED: "Trip completed",
  SCHEDULED: "Route scheduled",
  ABSENT: "Pupil absent",
}

const TIMELINE = [
  { status: "ROUTE_SCHEDULED", icon: Route },
  { status: "DEPARTED_DEPOT", icon: Bus },
  { status: "EN_ROUTE", icon: Navigation },
  { status: "ARRIVED_PICKUP", icon: MapPin },
  { status: "BOARDED", icon: CheckCircle },
  { status: "ARRIVED_SCHOOL", icon: Bus },
  { status: "DROPPED", icon: CheckCircle },
]

function formatTime(value?: string | null) {
  if (!value) return ""
  return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
}

function normaliseStatus(status?: string) {
  if (!status) return "SCHEDULED"
  if (status === "COMPLETED") return "DROPPED"
  return status
}

export default function TrackingPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<TrackingAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")

  const fetchTracking = async (silent = false) => {
    if (!session?.user?.id) return
    if (!silent) setLoading(true)
    setRefreshing(silent)
    setError("")

    try {
      const res = await fetch("/api/parent/tracking", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch live tracking")
      setAssignments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch live tracking")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTracking()
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    const timer = window.setInterval(() => fetchTracking(true), 30000)
    return () => window.clearInterval(timer)
  }, [session?.user?.id])

  const liveCount = useMemo(() => assignments.filter(a => a.live?.isLive).length, [assignments])

  return (
    <DashboardLayout title="Live Tracking">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Track your child's transport using live driver GPS and trip events from the database.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">The page refreshes automatically every 30 seconds while open.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchTracking(true)} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </div>

        {error && (
          <Card>
            <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">No active routes</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">No confirmed transport routes are currently assigned to your children.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="relative bg-gray-100 dark:bg-gray-900 min-h-72 flex items-center justify-center p-6">
                <div className="absolute inset-0 opacity-10">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={`v-${i}`} className="absolute border-gray-400 border" style={{ left: `${i * 10}%`, top: 0, bottom: 0, width: 1 }} />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={`h-${i}`} className="absolute border-gray-400 border" style={{ top: `${i * 12.5}%`, left: 0, right: 0, height: 1 }} />
                  ))}
                </div>
                <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
                  {assignments.map((assignment, index) => {
                    const hasLocation = assignment.live?.location
                    return (
                      <div key={assignment.id} className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${assignment.live?.isLive ? "bg-green-600" : "bg-black"}`}>
                            <Bus className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{assignment.schedule?.vehicle?.regPlate || `Vehicle ${index + 1}`}</p>
                            <p className="text-xs text-gray-500 truncate">{assignment.pupil?.fullName} · {assignment.schedule?.routeName}</p>
                          </div>
                        </div>
                        {hasLocation ? (
                          <div className="mt-3 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                            <p>Lat {assignment.live?.location?.latitude.toFixed(5)}, Lng {assignment.live?.location?.longitude.toFixed(5)}</p>
                            <p>Updated {formatTime(assignment.live?.location?.timestamp)}</p>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs text-gray-500">Waiting for driver location update.</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <CardContent className="p-4 flex items-center justify-between text-sm">
                <span>{liveCount} of {assignments.length} route{assignments.length === 1 ? "" : "s"} reporting live GPS within the last 15 minutes.</span>
                <Badge variant={liveCount > 0 ? "success" : "secondary"}>{liveCount > 0 ? "LIVE" : "WAITING"}</Badge>
              </CardContent>
            </Card>

            {assignments.map(assignment => {
              const currentStatus = normaliseStatus(assignment.live?.status)
              const activeIndex = Math.max(0, TIMELINE.findIndex(step => step.status === currentStatus))

              return (
                <Card key={assignment.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>{assignment.pupil?.fullName} — {assignment.schedule?.routeName}</span>
                      <Badge variant={assignment.live?.isLive ? "success" : "secondary"}>
                        {assignment.live?.isLive ? "LIVE" : STATUS_LABELS[currentStatus] || currentStatus}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-3 mb-6">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Bus className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-sm">Vehicle: {assignment.schedule?.vehicle?.regPlate || "TBA"}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Driver: {assignment.schedule?.driver?.user?.name || "TBA"}</p>
                        </div>
                        <div className="ml-auto text-right">
                          <p className="font-semibold">{assignment.schedule?.departureTime}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Departure</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <MapPin className="h-5 w-5" />
                        <div>
                          <p className="font-medium text-sm">Latest update</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {assignment.live?.updatedAt ? `${formatTime(assignment.live.updatedAt)} (${assignment.live.minutesSinceUpdate} min ago)` : "No live update yet"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-0">
                      {TIMELINE.map((step, i) => {
                        const matchingLog = assignment.live?.timeline?.find(log => normaliseStatus(log.status) === step.status)
                        const active = i <= activeIndex && currentStatus !== "SCHEDULED"
                        const Icon = step.icon
                        return (
                          <div key={step.status} className="flex items-start gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${active ? "bg-black text-white" : "bg-gray-100 text-gray-400"}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              {i < TIMELINE.length - 1 && (
                                <div className={`w-0.5 h-8 ${active && i < activeIndex ? "bg-black" : "bg-gray-200"}`} />
                              )}
                            </div>
                            <div className="pb-4 pt-1 flex items-center justify-between w-full gap-4">
                              <p className={`text-sm ${active ? "font-medium text-black dark:text-white" : "text-gray-400"}`}>{STATUS_LABELS[step.status]}</p>
                              {matchingLog?.timestamp && <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(matchingLog.timestamp)}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-blue-700">
                        Live tracking appears when the assigned driver publishes location or trip-progress updates from the driver dashboard. Notifications continue to use the existing route and boarding event workflow.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
