'use client'

import { useState, useEffect } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Clock,
  Bus,
  User,
  MapPin,
  Filter,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  Navigation,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface TripItem {
  id: string
  tripDate: string
  direction: string
  status: string
  price: number
  seatNumber: number
  schedule: {
    routeName: string
    departureTime: string
    school: { name: string } | null
    driver: { user: { name: string; phone: string | null; image: string | null } } | null
    vehicle: { regPlate: string; make: string; model: string } | null
  }
  pupil: { fullName: string; yearLevel: string }
  booking: { id: string; status: string }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  COMPLETED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-yellow-100 text-yellow-700'
}

export default function ParentHistoryPage() {
  const [trips, setTrips] = useState<TripItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [directionFilter, setDirectionFilter] = useState('')

  useEffect(() => {
    fetchHistory()
  }, [page, statusFilter, directionFilter, dateFrom, dateTo])

  async function fetchHistory() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (statusFilter) params.set('status', statusFilter)
      if (directionFilter) params.set('direction', directionFilter)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/parent/trips?${params}`)
      const data = await res.json()
      setTrips(data.trips || [])
      setTotal(data.total || 0)
      setTotalPages(data.pages || 1)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = trips.filter(t =>
    !search || 
    t.pupil.fullName.toLowerCase().includes(search.toLowerCase()) ||
    t.schedule.routeName.toLowerCase().includes(search.toLowerCase()) ||
    t.schedule.driver?.user.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout title="Trip History">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transport History</h1>
        <p className="text-slate-500">View all transport trips for your children</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Trips</p>
            <p className="text-2xl font-bold">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Active (this page)</p>
            <p className="text-2xl font-bold text-green-600">
              {trips.filter(t => t.status === 'ACTIVE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Cancelled (this page)</p>
            <p className="text-2xl font-bold text-red-600">
              {trips.filter(t => t.status === 'CANCELLED').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Spent</p>
            <p className="text-2xl font-bold text-blue-600">
              £{trips.reduce((a, t) => a + t.price, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <Label className="text-xs">Search</Label>
              <div className="relative mt-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Pupil name, route, driver..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <select
                className="w-full mt-1 border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-slate-500 flex items-center gap-1 mr-2">
              <Filter className="w-3 h-3" /> Direction:
            </span>
            {['', 'HOME_TO_SCHOOL', 'SCHOOL_TO_HOME'].map(d => (
              <button
                key={d}
                onClick={() => setDirectionFilter(d)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  directionFilter === d ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d === '' ? 'All' : d === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Trip List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Trips ({filtered.length} of {total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Navigation className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>No trips found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(trip => (
                <div key={trip.id} className="flex items-start justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border hover:bg-slate-100 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={STATUS_COLORS[trip.status] || 'bg-gray-100'}>
                        {trip.status === 'ACTIVE' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {trip.status === 'CANCELLED' && <XCircle className="w-3 h-3 mr-1" />}
                        {trip.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {trip.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
                      </Badge>
                      <span className="text-xs text-slate-400">Seat {trip.seatNumber}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-slate-700">
                        <User className="w-4 h-4 text-slate-400" />
                        {trip.pupil.fullName} (Yr {trip.pupil.yearLevel})
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        {trip.schedule.routeName}
                      </div>
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(trip.tripDate).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                        <span className="text-slate-400 ml-1">{trip.schedule.departureTime}</span>
                      </div>
                      {trip.schedule.driver && (
                        <div>
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                            <User className="w-4 h-4 text-slate-400" />
                            {trip.schedule.driver.user.name}
                          </div>
                          {trip.schedule.driver.user.phone && (
                            <a
                              href={`tel:${trip.schedule.driver.user.phone}`}
                              className="flex items-center gap-1 text-xs text-blue-600 mt-0.5 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              {trip.schedule.driver.user.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    {trip.schedule.vehicle && (
                      <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                        <Bus className="w-3 h-3" />
                        {trip.schedule.vehicle.make} {trip.schedule.vehicle.model} — {trip.schedule.vehicle.regPlate}
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <p className="font-bold text-slate-900 dark:text-white">£{trip.price.toFixed(2)}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {trip.schedule.school?.name}
                    </p>
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
    </DashboardLayout>
  )
}
