'use client'

import { useState, useEffect, use } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Bus,
  Users,
  ChevronLeft,
  Clock,
  MapPin,
  User,
  ChevronRight,
  Phone,
  Navigation,
  QrCode,
  FileText,
  Eye,
  Download,
  Trash2,
  Upload,
  File,
  AlertTriangle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface VehicleData {
  vehicle: {
    id: string
    regPlate: string
    make: string
    model: string
    type: string
    seats: number
    colour: string | null
    status: string
    motExpiry: string | null
    insuranceExpiry: string | null
    company: { name: string }
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
  driver: { user: { name: string; phone: string | null } } | null
  pupil: { fullName: string; yearLevel: string; school: { name: string } | null } | null
}

interface Schedule {
  id: string
  routeName: string
  departureTime: string
  direction: string
  status: string
  school: { name: string } | null
  driver: { user: { name: string } } | null
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
  IDLE: 'bg-gray-100 text-gray-600',
  MAINTENANCE: 'bg-orange-100 text-orange-700'
}

export default function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<VehicleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [activeTab, setActiveTab] = useState<'schedules' | 'trips' | 'documents'>('schedules')
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null)
  const [docs, setDocs] = useState<Array<{ id: string; fileName: string; fileUrl: string; docType: string; expiryDate: string | null; createdAt: string }>>([])
  const [docsLoading, setDocsLoading] = useState(false)

  useEffect(() => { fetchData() }, [page])

  useEffect(() => {
    if (activeTab === 'documents' && docs.length === 0) {
      setDocsLoading(true)
      fetch(`/api/admin/documents?entityType=VEHICLE&entityId=${id}`)
        .then(r => r.json())
        .then(d => { setDocs(Array.isArray(d) ? d : []); setDocsLoading(false) })
        .catch(() => setDocsLoading(false))
    }
  }, [activeTab])

  function isDocExpired(date: string | null) {
    if (!date) return false
    return new Date(date).getTime() < Date.now()
  }

  function isDocExpiringSoon(date: string | null) {
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
      const res = await fetch(`/api/admin/vehicles/${id}/trips?page=${page}`)
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
    return <div className="text-center py-12 text-slate-500 dark:text-slate-400">Vehicle not found</div>
  }

  const { vehicle, trips, schedules, total, pages } = data

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/vehicles">
          <Button variant="outline" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Vehicles
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {vehicle.regPlate} — {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-slate-500">{vehicle.type} · {vehicle.company.name}</p>
        </div>
        <Badge className={STATUS_COLORS[vehicle.status] || 'bg-gray-100'}>
          {vehicle.status}
        </Badge>
      </div>

      {/* Vehicle Info */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Capacity</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{vehicle.seats} seats</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Total Trips</p>
            <p className="text-2xl font-bold text-blue-600">{total}</p>
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
            <p className="text-sm text-slate-500 dark:text-slate-400">Passengers Served</p>
            <p className="text-2xl font-bold text-purple-600">
              {schedules.reduce((a, s) => a + s._count.seatAssignments, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expiry Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.motExpiry && (
          <Card className={new Date(vehicle.motExpiry) < new Date() ? 'border-red-300' : ''}>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">MOT Expiry</p>
              <p className={`text-sm font-medium ${new Date(vehicle.motExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                {new Date(vehicle.motExpiry).toLocaleDateString('en-GB', { dateStyle: 'full' })}
              </p>
            </CardContent>
          </Card>
        )}
        {vehicle.insuranceExpiry && (
          <Card className={new Date(vehicle.insuranceExpiry) < new Date() ? 'border-red-300' : ''}>
            <CardContent className="pt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">Insurance Expiry</p>
              <p className={`text-sm font-medium ${new Date(vehicle.insuranceExpiry) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                {new Date(vehicle.insuranceExpiry).toLocaleDateString('en-GB', { dateStyle: 'full' })}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
        {[
          { key: 'schedules', label: `Routes (${schedules.length})` },
          { key: 'trips', label: `Trip Log (${total})` },
          { key: 'documents', label: `Documents (${docs.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'schedules' | 'trips' | 'documents')}
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
                        <span className="flex items-center gap-1">
                          <User className="w-4 h-4" /> {schedule.driver?.user.name || 'No driver'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" /> {schedule._count.seatAssignments} pupils
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedSchedule === schedule.id ? 'rotate-90' : ''}`} />
                  </div>

                  {/* Expanded Passengers */}
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
                            <QrCode className="w-3 h-3" /> QR
                          </span>
                        )}
                      </div>
                      <p className="font-medium">{trip.schedule?.routeName}</p>
                      {trip.pupil && (
                        <p className="text-slate-600">
                          {trip.pupil.fullName} (Yr {trip.pupil.yearLevel})
                          {trip.pupil.school && ` · ${trip.pupil.school.name}`}
                        </p>
                      )}
                      {trip.driver && (
                        <p className="text-slate-500 dark:text-slate-400 text-xs">Driver: {trip.driver.user.name}</p>
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

                {/* Pagination */}
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
                <p>No documents attached to this vehicle</p>
                <p className="text-xs mt-1">Upload MOT records or insurance documents from the Document Vault</p>
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
                          isDocExpired(doc.expiryDate) ? (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Expired</Badge>
                          ) : isDocExpiringSoon(doc.expiryDate) ? (
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
    </div>
  )
}
