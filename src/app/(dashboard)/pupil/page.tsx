'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  QrCode,
  Calendar,
  Clock,
  Bus,
  MapPin,
  User,
  Phone,
  AlertTriangle,
  School,
  Download,
  CheckCircle,
  XCircle,
  Navigation
} from 'lucide-react'
import QRCode from 'qrcode'
import { Button } from '@/components/ui/button'

interface PupilData {
  id: string
  fullName: string
  yearLevel: string
  studentNumber: string
  platformId: string
  photo: string | null
  school: { name: string; address: string } | null
  pickupLocation: string | null
  specialRequirements: string | null
  qrCodeData: string
  identityCode: string
}

interface TripItem {
  id: string
  tripDate: string
  direction: string
  status: string
  price: number
  schedule: {
    routeName: string
    school: { name: string } | null
    driver: { user: { name: string; phone: string | null; image: string | null } } | null
    vehicle: { regPlate: string; make: string; model: string } | null
  }
  pupil: { fullName: string }
}

interface TripLog {
  id: string
  status: string
  timestamp: string
  qrScanned: boolean
  schedule: { routeName: string; direction: string }
  driver: { user: { name: string; phone: string | null; image: string | null } } | null
  vehicle: { regPlate: string } | null
}

interface DashboardData {
  pupil: PupilData
  upcomingTrips: TripItem[]
  tripHistory: TripLog[]
  currentSchedules: Array<{
    id: string
    schedule: {
      routeName: string
      departureTime: string
      direction: string
      school: { name: string } | null
      driver: { user: { name: string; phone: string | null; image: string | null } } | null
      vehicle: { regPlate: string; make: string; model: string; type: string } | null
    }
  }>
}

const STATUS_COLORS: Record<string, string> = {
  BOARDED: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  DROPPED: 'bg-blue-100 text-blue-700',
  EN_ROUTE: 'bg-yellow-100 text-yellow-700',
  ARRIVED: 'bg-purple-100 text-purple-700',
  ACTIVE: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700'
}

export default function PupilDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'overview' | 'trips' | 'history'>('overview')

  useEffect(() => {
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      const res = await fetch('/api/pupil/dashboard')
      if (!res.ok) throw new Error('Failed to load')
      const d = await res.json()
      setData(d)
      if (d.pupil.qrCodeData) {
        const url = await QRCode.toDataURL(d.pupil.qrCodeData, {
          width: 250,
          margin: 2,
          color: { dark: '#1e293b', light: '#ffffff' }
        })
        setQrDataUrl(url)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function downloadQR() {
    if (!qrDataUrl) return
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = `carity-qr-${data?.pupil.fullName?.replace(/\s+/g, '-')}.png`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-400">
        <p>No pupil account found.</p>
      </div>
    )
  }

  const { pupil, upcomingTrips, tripHistory, currentSchedules } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome, {pupil.fullName}!</h1>
        <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">{pupil.school?.name} · Year {pupil.yearLevel}</p>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'trips', label: 'Upcoming Trips' },
          { key: 'history', label: 'Trip History' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'overview' | 'trips' | 'history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* QR Code Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-500" />
                My Boarding QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {qrDataUrl ? (
                <>
                  <div className="p-4 bg-white dark:bg-gray-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                    <img src={qrDataUrl} alt="Boarding QR Code" className="w-52 h-52" />
                  </div>
                  <div className="mt-4 text-center">
                    <p className="font-semibold text-slate-900 dark:text-white">{pupil.fullName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{pupil.studentNumber || pupil.platformId}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400">{pupil.school?.name}</p>
                    <div className="mt-2">
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Manual identity code</p>
                      <p className="font-mono text-sm tracking-[0.18em] text-slate-900 dark:text-white">{pupil.identityCode}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={downloadQR}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download QR
                  </Button>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                    Show this QR code to the driver when boarding
                  </p>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <QrCode className="w-12 h-12 mx-auto mb-2" />
                  <p>Generating QR code...</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Schedules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-500" />
                My Transport
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentSchedules.length === 0 ? (
                <p className="text-slate-400 dark:text-slate-500 text-sm">No active transport schedules</p>
              ) : (
                <div className="space-y-3">
                  {currentSchedules.map(sa => (
                    <div key={sa.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-gray-700">
                      <div className="flex items-center gap-2 mb-2">
                        <Bus className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-sm">{sa.schedule.routeName}</span>
                        <Badge variant="outline" className="text-xs">
                          {sa.schedule.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {sa.schedule.departureTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {sa.schedule.school?.name}
                        </div>
                        {sa.schedule.vehicle && (
                          <div className="flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            {sa.schedule.vehicle.make} {sa.schedule.vehicle.model}
                          </div>
                        )}
                        {sa.schedule.driver && (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {sa.schedule.driver.user.name}
                          </div>
                        )}
                      </div>
                      {sa.schedule.driver?.user.phone && (
                        <a
                          href={`tel:${sa.schedule.driver.user.phone}`}
                          className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Phone className="w-3 h-3" />
                          {sa.schedule.driver.user.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-slate-500" />
                My Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Full Name</p>
                  <p className="font-medium">{pupil.fullName}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Year Level</p>
                  <p className="font-medium">Year {pupil.yearLevel}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Student No.</p>
                  <p className="font-medium">{pupil.studentNumber || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Platform ID</p>
                  <p className="font-medium">{pupil.platformId || '—'}</p>
                </div>
                {pupil.school && (
                  <div className="col-span-2">
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">School</p>
                    <p className="font-medium flex items-center gap-1">
                      <School className="w-4 h-4 text-slate-400" />
                      {pupil.school.name}
                    </p>
                  </div>
                )}
                {pupil.pickupLocation && (
                  <div className="col-span-2">
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Pickup Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      {pupil.pickupLocation}
                    </p>
                  </div>
                )}
                {pupil.specialRequirements && (
                  <div className="col-span-4">
                    <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400">Special Requirements</p>
                    <p className="font-medium text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {pupil.specialRequirements}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Trips Tab */}
      {activeTab === 'trips' && (
        <div className="space-y-4">
          {upcomingTrips.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>No upcoming trips booked</p>
              </CardContent>
            </Card>
          ) : (
            upcomingTrips.map(trip => (
              <Card key={trip.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={STATUS_COLORS[trip.status] || 'bg-gray-100'}>
                          {trip.status}
                        </Badge>
                        <Badge variant="outline">
                          {trip.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
                        </Badge>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-white">{trip.schedule.routeName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {new Date(trip.tripDate).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      {trip.schedule.driver && (
                        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                          <User className="w-4 h-4" />
                          Driver: {trip.schedule.driver.user.name}
                          {trip.schedule.driver.user.phone && (
                            <a
                              href={`tel:${trip.schedule.driver.user.phone}`}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {trip.schedule.driver.user.phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">£{trip.price.toFixed(2)}</p>
                      {trip.schedule.vehicle && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">{trip.schedule.vehicle.regPlate}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Trip History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Trip History</CardTitle>
          </CardHeader>
          <CardContent>
            {tripHistory.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400 dark:text-slate-400">
                <Navigation className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                <p>No trip history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tripHistory.map(trip => (
                  <div key={trip.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border dark:border-gray-700">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {trip.status === 'BOARDED' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : trip.status === 'ABSENT' ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <Navigation className="w-4 h-4 text-blue-500" />
                        )}
                        <Badge className={STATUS_COLORS[trip.status] || 'bg-gray-100'}>
                          {trip.status}
                        </Badge>
                        {trip.qrScanned && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> Scanned
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-sm">{trip.schedule?.routeName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-400">
                        {trip.schedule?.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
                      </p>
                      {trip.driver && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          Driver: {trip.driver.user.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-xs text-slate-400 dark:text-slate-500">
                      {new Date(trip.timestamp).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
