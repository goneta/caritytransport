'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Bus,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  LayoutList,
  CalendarDays
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Schedule {
  id: string
  routeName: string
  direction: string
  departureTime: string
  recurrence: string
  status: string
  school: { name: string; address: string } | null
  vehicle: { regPlate: string; make: string; model: string; type: string; seats: number } | null
  seatAssignments: Array<{
    pupil: { fullName: string; yearLevel: string; school: { name: string } | null }
  }>
  _count: { seatAssignments: number }
}

interface Unavailability {
  id: string
  date: string
  reason: string
  status: string
  adminNotified: boolean
}

interface TripLog {
  id: string
  status: string
  timestamp: string
  schedule: { routeName: string; direction: string }
  vehicle: { regPlate: string } | null
  pupil: { fullName: string } | null
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function DriverSchedulePage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [unavailability, setUnavailability] = useState<Unavailability[]>([])
  const [recentTrips, setRecentTrips] = useState<TripLog[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'week'>('list')
  const [showUnavailabilityDialog, setShowUnavailabilityDialog] = useState(false)
  const [unavailDate, setUnavailDate] = useState('')
  const [unavailReason, setUnavailReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(new Date())

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch('/api/driver/schedule')
      const data = await res.json()
      setSchedules(data.schedules || [])
      setUnavailability(data.unavailability || [])
      setRecentTrips(data.recentTrips || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function submitUnavailability() {
    if (!unavailDate || !unavailReason) return
    setSaving(true)
    try {
      const res = await fetch('/api/driver/unavailability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: unavailDate, reason: unavailReason })
      })
      if (res.ok) {
        setShowUnavailabilityDialog(false)
        setUnavailDate('')
        setUnavailReason('')
        fetchData()
      } else {
        const d = await res.json()
        alert(d.error || 'Failed to submit unavailability')
      }
    } finally {
      setSaving(false)
    }
  }

  async function deleteUnavailability(id: string) {
    if (!confirm('Remove this unavailability entry?')) return
    await fetch(`/api/driver/unavailability?id=${id}`, { method: 'DELETE' })
    fetchData()
  }

  // Week view helpers
  function getWeekDates(base: Date) {
    const d = new Date(base)
    const day = d.getDay()
    const mon = new Date(d)
    mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(mon)
      dt.setDate(mon.getDate() + i)
      return dt
    })
  }

  function isUnavailable(date: Date) {
    const ds = date.toISOString().split('T')[0]
    return unavailability.some(u => u.date.split('T')[0] === ds)
  }

  function getSchedulesForDay(date: Date) {
    const dayName = DAY_NAMES[date.getDay()]
    return schedules.filter(s => {
      if (s.recurrence === 'WEEKDAYS' && date.getDay() >= 1 && date.getDay() <= 5) return true
      if (s.recurrence === 'DAILY') return true
      if (s.recurrence === 'CUSTOM' && s.recurrence.includes(dayName)) return true
      return false
    })
  }

  const weekDates = getWeekDates(currentWeek)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const statusColor: Record<string, string> = {
    SCHEDULED: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-gray-100 text-gray-600',
    CANCELLED: 'bg-red-100 text-red-700'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Schedule</h1>
          <p className="text-slate-500">View your assigned routes and manage availability</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('list')}
          >
            <LayoutList className="w-4 h-4 mr-1" /> List
          </Button>
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setView('week')}
          >
            <CalendarDays className="w-4 h-4 mr-1" /> Week
          </Button>
          <Button onClick={() => setShowUnavailabilityDialog(true)} variant="outline" className="border-orange-300 text-orange-700">
            <AlertTriangle className="w-4 h-4 mr-1" /> Mark Unavailable
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Routes</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{schedules.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Active Routes</p>
            <p className="text-2xl font-bold text-green-600">{schedules.filter(s => s.status === 'ACTIVE').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Pupils</p>
            <p className="text-2xl font-bold text-blue-600">
              {schedules.reduce((a, s) => a + s._count.seatAssignments, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Days Unavailable</p>
            <p className="text-2xl font-bold text-orange-600">{unavailability.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Week View */}
      {view === 'week' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Week of {weekDates[0].getDate()} {MONTHS[weekDates[0].getMonth()]} {weekDates[0].getFullYear()}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(currentWeek)
                  d.setDate(d.getDate() - 7)
                  setCurrentWeek(d)
                }}>← Prev</Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentWeek(new Date())}>Today</Button>
                <Button variant="outline" size="sm" onClick={() => {
                  const d = new Date(currentWeek)
                  d.setDate(d.getDate() + 7)
                  setCurrentWeek(d)
                }}>Next →</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {weekDates.map((date, i) => {
                const isToday = date.getTime() === today.getTime()
                const unavail = isUnavailable(date)
                const daySchedules = getSchedulesForDay(date)
                return (
                  <div
                    key={i}
                    className={`rounded-lg p-2 min-h-24 border ${
                      isToday ? 'border-blue-400 bg-blue-50' :
                      unavail ? 'border-orange-300 bg-orange-50' :
                      'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="text-center mb-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{DAY_NAMES[date.getDay()]}</p>
                      <p className={`text-sm font-bold ${isToday ? 'text-blue-600' : 'text-slate-900'}`}>
                        {date.getDate()}
                      </p>
                      {unavail && <span className="text-xs text-orange-600">🚫 Off</span>}
                    </div>
                    {daySchedules.map(s => (
                      <div key={s.id} className="text-xs bg-blue-100 text-blue-800 rounded p-1 mb-1 truncate">
                        {s.departureTime} {s.routeName}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="grid gap-4">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                No routes assigned yet
              </CardContent>
            </Card>
          ) : (
            schedules.map(schedule => (
              <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Bus className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">{schedule.routeName}</h3>
                        <Badge className={statusColor[schedule.status] || 'bg-gray-100'}>
                          {schedule.status}
                        </Badge>
                        <Badge variant="outline">
                          {schedule.direction === 'HOME_TO_SCHOOL' ? '🏠→🏫' : '🏫→🏠'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {schedule.departureTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {schedule.school?.name || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Bus className="w-4 h-4" />
                          {schedule.vehicle?.regPlate || 'No vehicle'} ({schedule.vehicle?.type})
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {schedule._count.seatAssignments} pupils
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-slate-400">{schedule.recurrence}</div>

                      {/* Pupil list */}
                      {schedule.seatAssignments.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-xs font-medium text-slate-600 mb-2">Passengers:</p>
                          <div className="flex flex-wrap gap-2">
                            {schedule.seatAssignments.slice(0, 6).map((sa, idx) => (
                              <span key={idx} className="text-xs bg-slate-100 dark:bg-slate-800 rounded px-2 py-1">
                                {sa.pupil.fullName} (Yr {sa.pupil.yearLevel})
                              </span>
                            ))}
                            {schedule.seatAssignments.length > 6 && (
                              <span className="text-xs text-slate-400">+{schedule.seatAssignments.length - 6} more</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 ml-4 mt-1" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Unavailability List */}
      {unavailability.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              My Unavailability ({unavailability.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unavailability.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {new Date(u.date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{u.reason}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={
                        u.status === 'SUBSTITUTE_ASSIGNED' ? 'bg-green-100 text-green-700' :
                        u.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }>
                        {u.status.replace(/_/g, ' ')}
                      </Badge>
                      {u.adminNotified && (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Admin notified
                        </span>
                      )}
                    </div>
                  </div>
                  {u.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => deleteUnavailability(u.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Trips */}
      {recentTrips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Trip Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTrips.slice(0, 5).map(trip => (
                <div key={trip.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{trip.schedule?.routeName}</span>
                    {trip.pupil && <span className="text-slate-500 dark:text-slate-400 ml-2">— {trip.pupil.fullName}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={
                      trip.status === 'BOARDED' ? 'bg-green-100 text-green-700' :
                      trip.status === 'ABSENT' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }>
                      {trip.status}
                    </Badge>
                    <span className="text-slate-400 text-xs">
                      {new Date(trip.timestamp).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unavailability Dialog */}
      <Dialog open={showUnavailabilityDialog} onOpenChange={setShowUnavailabilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Unavailability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={unavailDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setUnavailDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Reason</Label>
              <textarea
                className="w-full border rounded-lg p-2 text-sm min-h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please provide a reason for your unavailability..."
                value={unavailReason}
                onChange={e => setUnavailReason(e.target.value)}
              />
            </div>
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
              ⚠️ Submitting this will notify admin immediately. A substitute driver may be assigned and parents will be informed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowUnavailabilityDialog(false)}>Cancel</Button>
              <Button
                onClick={submitUnavailability}
                disabled={saving || !unavailDate || !unavailReason}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {saving ? 'Submitting...' : 'Submit Unavailability'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
