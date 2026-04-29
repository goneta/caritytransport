"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Navigation, RefreshCw, AlertTriangle, Radio, Clock } from "lucide-react"

type OperationRoute = {
  id: string
  routeName: string
  status: string
  scheduleStatus: string
  departureTime: string
  driverName: string
  driverPhone: string | null
  vehicle: string
  capacity: number
  activeBookings: number
  totalUpdates: number
  latitude: number | null
  longitude: number | null
  lastUpdateAt: string | null
  lastUpdateMinutesAgo: number | null
  stale: boolean
  notes: string | null
}

type OperationsPayload = {
  routes: OperationRoute[]
  metrics: {
    liveRoutes: number
    staleRoutes: number
    activeRoutes: number
    totalRoutes: number
  }
  generatedAt: string
}

const statusStyles: Record<string, string> = {
  EN_ROUTE: "bg-blue-100 text-blue-800",
  DEPARTED_DEPOT: "bg-indigo-100 text-indigo-800",
  ARRIVED_PICKUP: "bg-purple-100 text-purple-800",
  BOARDED: "bg-green-100 text-green-800",
  ARRIVED_SCHOOL: "bg-emerald-100 text-emerald-800",
  DROPPED: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  ACTIVE: "bg-green-100 text-green-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function projectPoint(route: OperationRoute, routes: OperationRoute[]) {
  const located = routes.filter((item) => item.latitude !== null && item.longitude !== null)
  if (route.latitude === null || route.longitude === null || located.length === 0) return null

  const lats = located.map((item) => item.latitude as number)
  const lngs = located.map((item) => item.longitude as number)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  const latSpan = Math.max(maxLat - minLat, 0.01)
  const lngSpan = Math.max(maxLng - minLng, 0.01)

  const x = 12 + (((route.longitude as number) - minLng) / lngSpan) * 76
  const y = 88 - (((route.latitude as number) - minLat) / latSpan) * 76
  return { x, y }
}

export default function LiveOperationsMap() {
  const [payload, setPayload] = useState<OperationsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetch("/api/admin/operations-map", { cache: "no-store" })
      if (res.ok) setPayload(await res.json())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = window.setInterval(() => loadData(true), 30000)
    return () => window.clearInterval(interval)
  }, [])

  const routes = payload?.routes || []
  const selectedRoute = useMemo(
    () => routes.find((route) => route.id === selectedRouteId) || routes[0] || null,
    [routes, selectedRouteId]
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Live Operations Map
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => loadData(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-72 flex items-center justify-center text-sm text-gray-500">Loading live operations…</div>
        ) : !routes.length ? (
          <div className="h-72 flex flex-col items-center justify-center text-sm text-gray-500 gap-2">
            <MapPin className="h-8 w-8 text-gray-300" />
            No live route activity yet.
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3">
                  <p className="text-xs text-blue-600 dark:text-blue-300">Live GPS</p>
                  <p className="text-2xl font-bold">{payload?.metrics.liveRoutes || 0}</p>
                </div>
                <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3">
                  <p className="text-xs text-green-600 dark:text-green-300">Active</p>
                  <p className="text-2xl font-bold">{payload?.metrics.activeRoutes || 0}</p>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 p-3">
                  <p className="text-xs text-amber-600 dark:text-amber-300">Stale/Missing</p>
                  <p className="text-2xl font-bold">{payload?.metrics.staleRoutes || 0}</p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
                  <p className="text-xs text-gray-500">Total Routes</p>
                  <p className="text-2xl font-bold">{payload?.metrics.totalRoutes || 0}</p>
                </div>
              </div>

              <div className="relative h-80 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-gradient-to-br from-sky-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
                <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                {routes.map((route) => {
                  const point = projectPoint(route, routes)
                  if (!point) return null
                  const active = selectedRoute?.id === route.id
                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-lg transition-transform ${active ? "scale-125 border-black bg-black" : route.stale ? "border-amber-500 bg-amber-500" : "border-green-600 bg-green-600"}`}
                      style={{ left: `${point.x}%`, top: `${point.y}%` }}
                      title={route.routeName}
                    >
                      <BusMarker active={active} />
                    </button>
                  )
                })}
                <div className="absolute left-3 bottom-3 rounded-lg bg-white/90 dark:bg-gray-900/90 px-3 py-2 text-xs text-gray-500 shadow">
                  Map uses live GPS bounds from driver tracking updates.
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {selectedRoute && (
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{selectedRoute.routeName}</h3>
                      <p className="text-xs text-gray-500">{selectedRoute.vehicle}</p>
                    </div>
                    <Badge className={statusStyles[selectedRoute.status] || "bg-gray-100 text-gray-700"}>{formatStatus(selectedRoute.status)}</Badge>
                  </div>
                  <div className="mt-4 space-y-2 text-sm">
                    <p><span className="text-gray-500">Driver:</span> {selectedRoute.driverName}</p>
                    <p><span className="text-gray-500">Departure:</span> {selectedRoute.departureTime}</p>
                    <p><span className="text-gray-500">Bookings:</span> {selectedRoute.activeBookings}{selectedRoute.capacity ? ` / ${selectedRoute.capacity}` : ""}</p>
                    <p><span className="text-gray-500">GPS:</span> {selectedRoute.latitude && selectedRoute.longitude ? `${selectedRoute.latitude.toFixed(5)}, ${selectedRoute.longitude.toFixed(5)}` : "Not published"}</p>
                    <p className="flex items-center gap-1"><Clock className="h-4 w-4" /> {selectedRoute.lastUpdateMinutesAgo === null ? "No updates" : `${selectedRoute.lastUpdateMinutesAgo} min ago`}</p>
                    {selectedRoute.stale && <p className="flex items-center gap-1 text-amber-600"><AlertTriangle className="h-4 w-4" /> Location is stale or missing</p>}
                  </div>
                </div>
              )}

              <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                {routes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    onClick={() => setSelectedRouteId(route.id)}
                    className={`w-full text-left rounded-lg border p-3 transition-colors ${selectedRoute?.id === route.id ? "border-black dark:border-white bg-gray-50 dark:bg-gray-900" : "border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{route.routeName}</p>
                      {route.latitude !== null && route.longitude !== null ? <Radio className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{route.driverName} · {formatStatus(route.status)}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function BusMarker({ active }: { active: boolean }) {
  return (
    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${active ? "bg-black" : "bg-inherit"}`}>
      <Navigation className="h-4 w-4" />
    </span>
  )
}
