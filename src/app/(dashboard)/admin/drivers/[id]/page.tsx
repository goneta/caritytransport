'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Users,
  ChevronLeft,
  Clock,
  MapPin,
  Bus,
  ChevronRight,
  Phone,
  Navigation,
  QrCode,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Mail,
  FileText,
  Eye,
  Download,
  Trash2,
  Upload,
  File
} from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface DriverData {
  driver: {
    id: string
    licenceNumber: string | null
    licenceClass: string | null
    licenceExpiry: string | null
    dbsCheckDate: string | null
    driverStatus: string
    user: { name: string; email: string; phone: string | null; status: string; image: string | null }
    company: { name: string } | null
    unavailability: Array<{
      id: string
      date: string
      reason: string
      status: string
      adminNotified: boolean
    }>
  }
  trips: TripLog[]
  total: number
  page: number
  pages: number
  schedules: Schedule[]
}

interface TripLog {
  id: string
  status: string
  timestamp: string
  qrScanned: boolean
  schedule: { routeName: string; direction: string; school: { name: string } | null }
  vehicle: { regPlate: string; make: string; model: string; type: string } | null
  pupil: { fullName: string; yearLevel: string; school: { name: string } | null } | null
}

interface Schedule {
  id: string
  routeName: string
  departureTime: string
  direction: string
  status: string
  school: { name: string } | null
  vehicle: { regPlate: string; seats: number } | null
  seatAssignments: Array<{
    pupil: {
      fullName: string
      yearLevel: string
      school: { name: string } | null
      parent: { user: { name: string; phone: string | null } }
    }
  }>
  _count: { seatAssignments: number }
}

const STATUS_COLORS: Record<string, string> = {
  BOARDED: 'bg-green-100 text-green-700',
  ABSENT: 'bg-red-100 text-red-700',
  DROPPED: 'bg-blue-100 text-blue-700',
  EN_ROUTE: 'bg-yellow-100 text-yellow-700',
  ARRIVED: 'bg-purple-100 text-purple-700',
  ACTIVE: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-gray-100 text-gray-600'
}

export default function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<DriverData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'schedules' | 'trips' | 'unavailability' | 'documents'>('schedules')
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
  const [docs, setDocs] = useState<Array<{ id: string; fileName: string; fileUrl: string; docType: string; expiryDate: string | null; createdAt: string }>>([])
  const [docsLoading, setDocsLoading] = useState(false)

  useEffect(() => { fetchData() }, [page])

  useEffect(() => {
    if (activeTab === 'documents' && docs.length === 0) {
      setDocsLoading(true)
      fetch(`/api/admin/documents?entityType=DRIVER&entityId=${id}`)
        .then(r => r.json())
        .then(d => { setDocs(Array.isArray(d) ? d : []); setDocsLoading(false) })
        .catch(() => setDocsLoading(false))
    }
  }, [activeTab])

  function isExpired(date: string | null) {
    if (!date) return false
    return new Date(date).getTime() < Date.now()
  }

  function isExpiringSoon(date: string | null) {
    if (!date) return false
    const diff = new Date(date).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000
  }

  async function deleteDoc(docId: string, name: string) {
    if (!confirm('Delete "' + name + '"?')) return
    try {
      const res = await fetch('/api/admin/documents?id=' + docId, { method: 'DELETE' })
      if (res.ok) {
        setDocs(prev => prev.filter(d => d.id !== docId))
        toast.success('Document deleted')
      }
    } catch { toast.error('Failed to delete') }
  }

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/drivers/${id}/trips?page=${page}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  if (!data) {
    return <div className="text-center py-12 text-slate-500 dark:text-slate-400">Driver not found</div>
  }

  const { driver, trips, schedules, total, pages } = data
  const licenceExpirySoon = driver.licenceExpiry && new Date(driver.licenceExpiry) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/drivers">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Drivers
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{driver.user.name}</h1>
          <p className="text-slate-500">{driver.company?.name || 'Independent'}</p>
        </div>
        <Badge className={STATUS_COLORS[driver.user.status] || 'bg-gray-100'}>
          {driver.user.status}
        </Badge>
      </div>

      {/* Driver Info */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Email</p>
              <a href={`mailto:${driver.user.email}`} className="text-blue-600 hover:underline flex items-center gap-1">
                <Mail className="w-4 h-4" /> {driver.user.email}
              </a>
            </div>
            {driver.user.phone && (
              <div>
                <p className="text-slate-500">Phone</p>
                <a href={`tel:${driver.user.phone}`} className="text-blue-600 hover:underline flex items-center gap-1">
                  <Phone className="w-4 h-4" /> {driver.user.phone}
                </a>
              </div>
            )}
            <div>
              <p className="text-slate-500">Licence No.</p>
              <p className="font-medium">{driver.licenceNumber || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Licence Class</p>
              <p className="font-medium">{driver.licenceClass || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Licence Expiry</p>
              <p className={`font-medium ${licenceExpirySoon ? 'text-red-600' : 'text-slate-900'}`}>
                {driver.licenceExpiry
                  ? new Date(driver.licenceExpiry).toLocaleDateString('en-GB')
                  : '—'}
                {licenceExpirySoon && <AlertTriangle className="w-4 h-4 inline ml-1" />}
              </p>
            </div>
            <div>
              <p className="text-slate-500">DBS Check</p>
              <p className="font-medium">
                {driver.dbsCheckDate
                  ? new Date(driver.dbsCheckDate).toLocaleDateString('en-GB')
                  : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <p className="text-sm text-slate-500 dark:text-slate-400">Active Routes</p>
            <p className="text-2xl font-bold text-green-600">
              {schedules.filter(s => s.status === 'ACTIVE' || s.status === 'SCHEDULED').length}
            </p>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">Unavailability</p>
            <p className={`text-2xl font-bold ${driver.unavailability.length > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
              {driver.unavailability.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {[
          { key: 'schedules', label: `Routes (${schedules.length})` },
          { key: 'trips', label: `Trip Log (${total})` },
          { key: 'unavailability', label: `Unavailability (${driver.unavailability.length})` },
          { key: 'documents', label: `Documents (${docs.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'schedules' | 'trips' | 'unavailability' | 'documents')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key ? 'bg-white text-slate-900 shadow' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Routes Tab */}
      {activeTab === 'schedules' && (
        <div className="space-y-3">
          {schedules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">No routes assigned</CardContent>
            </Card>
          ) : (
            schedules.map(schedule => (
              <Card key={schedule.id}>
                <CardContent className="pt-4">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedSchedule(expandedSchedule === schedule.id ? null : schedule.id)}
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-slate-900 dark:text-white">{schedule.routeName}</h3>
                        <Badge variant="outline">
                          {schedule.direction === 'HOME_TO_SCHOOL' ? '→ School' : '→ Home'}
                        </Badge>
                        <Badge className={STATUS_COLORS[schedule.status] || ''}>
                          {schedule.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> {schedule.departureTime}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {schedule.school?.name || 'N/A'}
                        </span>
                        {schedule.vehicle && (
                          <span className="flex items-center gap-1">
                            <Bus className="w-4 h-4" /> {schedule.vehicle.regPlate} ({schedule.vehicle.seats} seats)
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" /> {schedule._count.seatAssignments} pupils
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedSchedule === schedule.id ? 'rotate-90' : ''}`} />
                  </div>

                  {expandedSchedule === schedule.id && schedule.seatAssignments.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm font-medium text-slate-600 mb-3">
                        Passengers ({schedule.seatAssignments.length}):
                      </p>
                      <div className="grid gap-2">
                        {schedule.seatAssignments.map((sa, i) => (
                          <div key={i} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm">
                            <div>
                              <span className="font-medium">{sa.pupil.fullName}</span>
                              <span className="text-slate-400 ml-2">Yr {sa.pupil.yearLevel}</span>
                              {sa.pupil.school && (
                                <span className="text-slate-400 ml-2">· {sa.pupil.school.name}</span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {sa.pupil.parent.user.name}
                              {sa.pupil.parent.user.phone && (
                                <a href={`tel:${sa.pupil.parent.user.phone}`} className="text-blue-500 ml-1 flex items-center gap-0.5">
                                  <Phone className="w-3 h-3" /> {sa.pupil.parent.user.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Trip Log Tab */}
      {activeTab === 'trips' && (
        <Card>
          <CardContent className="pt-4">
            {trips.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <Navigation className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No trip records</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map(trip => (
                  <div key={trip.id} className="flex items-start justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border text-sm">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={STATUS_COLORS[trip.status] || 'bg-gray-100'}>
                          {trip.status}
                        </Badge>
                        {trip.qrScanned && (
                          <span className="text-xs text-blue-600 flex items-center gap-1">
                            <QrCode className="w-3 h-3" /> QR Scanned
                          </span>
                        )}
                      </div>
                      <p className="font-medium">{trip.schedule?.routeName}</p>
                      {trip.pupil && (
                        <p className="text-slate-600">
                          {trip.pupil.fullName} (Yr {trip.pupil.yearLevel})
                        </p>
                      )}
                      {trip.vehicle && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs">
                          {trip.vehicle.make} {trip.vehicle.model} — {trip.vehicle.regPlate}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(trip.timestamp).toLocaleString('en-GB', {
                        dateStyle: 'short',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                ))}
                {pages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Page {page} of {pages}</span>
                    <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <Card>
          <CardContent className="pt-4">
            {docsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
            ) : docs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No documents attached to this driver</p>
                <p className="text-xs mt-1">Upload DBS certificates or driver licences from the Document Vault</p>
                <Link href="/admin/documents">
                  <Button size="sm" className="mt-3">
                    <Upload className="w-4 h-4 mr-1" /> Go to Document Vault
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {docs.map(doc => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border text-sm">
                    <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0 border">
                      {doc.fileUrl.startsWith("data:application/pdf")
                        ? <FileText className="h-5 w-5 text-red-500" />
                        : <File className="h-5 w-5 text-blue-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{doc.fileName}</span>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.docType}</Badge>
                        <span className="text-xs text-slate-400">{new Date(doc.createdAt).toLocaleDateString('en-GB')}</span>
                        {doc.expiryDate && (
                          isExpired(doc.expiryDate) ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>
                          ) : isExpiringSoon(doc.expiryDate) ? (
                            <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                              <AlertTriangle className="w-2.5 h-2.5 mr-0.5 inline" />
                              Expires {new Date(doc.expiryDate).toLocaleDateString('en-GB')}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Expires {new Date(doc.expiryDate).toLocaleDateString('en-GB')}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          const win = window.open()
                          if (win) {
                            if (doc.fileUrl.startsWith("data:application/pdf")) {
                              win.document.write('<iframe src="' + doc.fileUrl + '" style="width:100%;height:100%;border:none;" title="' + doc.fileName + '"></iframe>')
                            } else {
                              win.document.write('<img src="' + doc.fileUrl + '" alt="' + doc.fileName + '" style="max-width:100%;height:auto;" />')
                            }
                            win.document.title = doc.fileName
                          }
                        }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="View"
                      >
                        <Eye className="h-4 w-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => {
                          const a = document.createElement('a')
                          a.href = doc.fileUrl
                          a.download = doc.fileName
                          a.click()
                        }}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded" title="Download"
                      >
                        <Download className="h-4 w-4 text-slate-500" />
                      </button>
                      <button
                        onClick={() => deleteDoc(doc.id, doc.fileName)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded" title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t flex justify-end">
                  <Link href="/admin/documents">
                    <Button size="sm" variant="outline">
                      <Upload className="w-4 h-4 mr-1" /> Upload More in Document Vault
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Unavailability Tab */}
      {activeTab === 'unavailability' && (
        <div className="space-y-3">
          {driver.unavailability.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>No unavailability records</p>
              </CardContent>
            </Card>
          ) : (
            driver.unavailability.map(u => (
              <Card key={u.id} className="border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {new Date(u.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">{u.reason}</p>
                      <div className="flex items-center gap-2 mt-2">
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
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
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
