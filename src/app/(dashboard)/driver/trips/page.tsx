'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Bus,
  User,
  MapPin,
  ChevronLeft,
  ChevronRight,
  QrCode,
  CheckCircle,
  XCircle,
  Navigation
} from 'lucide-react'

interface TripLog {
  id: string
  status: string
  timestamp: string
  qrScanned: boolean
  notes: string | null
  schedule: { routeName: string; direction: string; school: { name: string } | null }
  vehicle: { regPlate: string; make: string; model: string } | null
  pupil: {
    fullName: string
    yearLevel: string
    parent: { user: { name: string; phone: string | null } }
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  BOARDED: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  DROPPED: 'bg-blue-100 text-blue-700',
  EN_ROUTE: 'bg-yellow-100 text-yellow-700',
  ARRIVED: 'bg-purple-100 text-purple-700'
}

export default function DriverTripsPage() {
  const [trips, setTrips] = useState<TripLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => { fetchTrips(page) }, [page])

  async function fetchTrips(p: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/driver/trips?page=${p}&limit=20`)
      const data = await res.json()
      setTrips(data.trips || [])
      setTotalPages(data.pages || 1)
      setTotal(data.total || 0)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    boarded: trips.filter(t => t.status === 'BOARDED').length,
    absent: trips.filter(t => t.status === 'ABSENT').length,
    qrScanned: trips.filter(t => t.qrScanned).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Trip Log</h1>
        <p className="text-slate-500">Personal history of all your trips and passenger records</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Trips</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Boarded (this page)</p>
            <p className="text-2xl font-bold text-green-600">{stats.boarded}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Absent (this page)</p>
            <p className="text-2xl font-bold text-red-600">{stats.absent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">QR Scanned (this page)</p>
            <p className="text-2xl font-bold text-blue-600">{stats.qrScanned}</p>
          </CardContent>
        </Card>
      </div>

      {/* Trip List */}
      <Card>
        <CardHeader>
          <CardTitle>Trip History</CardTitle>
        </CardHeader>
        <CardContent>
          {trips.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Navigation className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No trip records yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {trips.map(trip => (
                <div key={trip.id} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={STATUS_COLORS[trip.status] || 'bg-gray-100'}>
                        {trip.status}
                      </Badge>
                      {trip.qrScanned && (
                        <span className="text-xs text-blue-600 flex items-center gap-1">
                          <QrCode className="w-3 h-3" /> QR Scanned
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span className="font-medium">{trip.schedule?.routeName}</span>
                        <span className="text-slate-400">
                          ({trip.schedule?.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'})
                        </span>
                      </div>
                      {trip.pupil && (
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <User className="w-4 h-4 text-slate-400" />
                          {trip.pupil.fullName} (Yr {trip.pupil.yearLevel})
                        </div>
                      )}
                      {trip.vehicle && (
                        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          <Bus className="w-4 h-4 text-slate-400" />
                          {trip.vehicle.regPlate}
                        </div>
                      )}
                    </div>

                    {trip.pupil && (
                      <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Parent: {trip.pupil.parent.user.name}
                        {trip.pupil.parent.user.phone && ` · ${trip.pupil.parent.user.phone}`}
                      </div>
                    )}

                    {trip.notes && (
                      <p className="mt-1 text-xs text-amber-600">{trip.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 ml-4">
                    <Clock className="w-3 h-3" />
                    {new Date(trip.timestamp).toLocaleString('en-GB', {
                      dateStyle: 'short',
                      timeStyle: 'short'
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
