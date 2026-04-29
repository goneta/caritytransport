"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Search, Filter, Calendar, Clock, MapPin, User, Users, Briefcase,
  FileText, Eye, CheckCircle, XCircle, Loader2, Plus, Copy, X
} from "lucide-react"
import toast from "react-hot-toast"

// ── Mappings ──
const ROLE_TITLES: Record<string, string> = {
  operations: 'Operations', drivers: 'Drivers', scheduler: 'Scheduler',
  admin: 'Admin', pupilcarer: 'Pupil Carer'
}
const POSITION_TO_SYSTEM_ROLE: Record<string, string> = {
  'Operations': 'OPERATIONS', 'Drivers': 'DRIVER', 'Scheduler': 'SCHEDULER',
  'Admin': 'ADMIN', 'Pupil Carer': 'OPERATIONS'
}

// ── Helpers ──
function safeParse(val: any) {
  if (!val) return null
  if (typeof val === 'object') return val
  try { return JSON.parse(val) } catch { return null }
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Pending', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    REVIEWED: { label: 'Reviewed', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    INTERVIEW: { label: 'Interview', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
    HIRED: { label: 'Hired', cls: 'bg-green-100 text-green-800 border-green-200' },
    REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-800 border-red-200' },
  }
  const s = map[status] || { label: status, cls: 'bg-gray-100 text-gray-800' }
  return <Badge className={s.cls}>{s.label}</Badge>
}

function initials(name: string) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function fmtDate(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtTime(d: string | null | undefined) {
  if (!d) return '-'
  return new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function generatePassword() {
  const words = ['Brave', 'Calm', 'Bright', 'Swift', 'Kind', 'Bold', 'Wise']
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const word = words[Math.floor(Math.random() * words.length)]
  let suffix = ''
  for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)]
  return word + suffix + '!'
}

function generateEmployeeId() {
  return 'EMP-' + String(Math.floor(100000 + Math.random() * 900000))
}

function getPositions(app: any): string[] {
  if (!app.positions) return []
  if (Array.isArray(app.positions)) return app.positions.map((p: string) => ROLE_TITLES[p] || p)
  const parsed = safeParse(app.positions)
  if (Array.isArray(parsed)) return parsed.map((p: string) => ROLE_TITLES[p] || p)
  return [String(app.positions)]
}

// ── Main Page ──
export default function AdminCareersPage() {
  const [applications, setApplications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'applications' | 'interviews' | 'employees'>('applications')

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('__all__')
  const [positionFilter, setPositionFilter] = useState('__all__')

  // Modals
  const [detailApp, setDetailApp] = useState<any | null>(null)
  const [interviewModal, setInterviewModal] = useState<any | null>(null)
  const [hireModal, setHireModal] = useState<any | null>(null)
  const [credentialsModal, setCredentialsModal] = useState<any | null>(null)

  // Interview form
  const [intForm, setIntForm] = useState({ date: '', time: '', type: 'In-person', location: '', interviewer: '', notes: '' })

  // Hire form
  const [hireForm, setHireForm] = useState({ position: '', startDate: '', employeeId: '', username: '', password: '' })

  // Notes
  const [newNote, setNewNote] = useState('')

  const [actionLoading, setActionLoading] = useState(false)

  // ── Fetch ──
  const fetchApplications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/careers')
      const data = await res.json()
      setApplications(Array.isArray(data) ? data : data.applications || [])
    } catch {
      toast.error('Failed to load applications')
    }
    setLoading(false)
  }

  useEffect(() => { fetchApplications() }, [])

  // ── PATCH helper ──
  const patchApplication = async (id: string, body: any) => {
    setActionLoading(true)
    try {
      const res = await fetch('/api/admin/careers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...body }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed') }
      const updated = await res.json()
      setApplications(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a))
      return updated
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
      return null
    } finally {
      setActionLoading(false)
    }
  }

  // ── Stats ──
  const stats = {
    total: applications.length,
    pending: applications.filter(a => a.status === 'PENDING').length,
    interviews: applications.filter(a => a.status === 'INTERVIEW').length,
    hired: applications.filter(a => a.status === 'HIRED').length,
    rejected: applications.filter(a => a.status === 'REJECTED').length,
  }

  // ── Filtered applications ──
  const filtered = applications.filter(app => {
    if (statusFilter !== '__all__' && app.status !== statusFilter) return false
    if (positionFilter !== '__all__') {
      const pos = getPositions(app)
      if (!pos.some(p => p === positionFilter)) return false
    }
    if (search) {
      const s = search.toLowerCase()
      const matchName = (app.firstName + ' ' + app.surname).toLowerCase().includes(s)
      const matchEmail = (app.email || '').toLowerCase().includes(s)
      const matchRef = (app.reference || app.id || '').toLowerCase().includes(s)
      if (!matchName && !matchEmail && !matchRef) return false
    }
    return true
  })

  // ── Interviews ──
  const interviewApps = applications
    .filter(a => a.status === 'INTERVIEW')
    .sort((a, b) => new Date(a.interviewDate || 0).getTime() - new Date(b.interviewDate || 0).getTime())

  // ── Employees (hired) ──
  const hiredApps = applications.filter(a => a.status === 'HIRED')

  // ── Actions ──
  const handleMarkReviewed = async (app: any) => {
    const result = await patchApplication(app.id, { action: 'mark_reviewed' })
    if (result) {
      toast.success('Marked as reviewed')
      if (detailApp?.id === app.id) setDetailApp({ ...detailApp, ...result, status: result.status || 'REVIEWED' })
    }
  }

  const handleScheduleInterview = async () => {
    if (!interviewModal) return
    const result = await patchApplication(interviewModal.id, {
      action: 'schedule_interview',
      interviewDate: intForm.date + 'T' + intForm.time,
      interviewType: intForm.type,
      interviewLocation: intForm.location,
      interviewer: intForm.interviewer,
      interviewNotes: intForm.notes,
    })
    if (result) {
      toast.success('Interview scheduled')
      setInterviewModal(null)
      if (detailApp?.id === interviewModal.id) setDetailApp({ ...detailApp, ...result })
    }
  }

  const handleHire = async () => {
    if (!hireModal) return
    const result = await patchApplication(hireModal.id, {
      action: 'hire',
      hiredPosition: hireForm.position,
      startDate: hireForm.startDate,
      employeeId: hireForm.employeeId,
      loginUsername: hireForm.username,
      loginPassword: hireForm.password,
      systemRole: POSITION_TO_SYSTEM_ROLE[hireForm.position] || 'OPERATIONS',
    })
    if (result) {
      toast.success('Candidate hired!')
      setHireModal(null)
      if (detailApp?.id === hireModal.id) setDetailApp({ ...detailApp, ...result, status: 'HIRED' })
      setCredentialsModal({
        name: hireModal.firstName + ' ' + hireModal.surname,
        position: hireForm.position,
        employeeId: hireForm.employeeId,
        username: hireForm.username,
        password: hireForm.password,
      })
    }
  }

  const handleReject = async (app: any) => {
    if (!confirm('Are you sure you want to reject this application?')) return
    const result = await patchApplication(app.id, { action: 'reject' })
    if (result) {
      toast.success('Application rejected')
      if (detailApp?.id === app.id) setDetailApp({ ...detailApp, ...result, status: result.status || 'REJECTED' })
    }
  }

  const handleAddNote = async (app: any) => {
    if (!newNote.trim()) return
    const result = await patchApplication(app.id, { action: 'add_note', note: newNote.trim() })
    if (result) {
      toast.success('Note added')
      setNewNote('')
      setDetailApp({ ...detailApp, ...result })
    }
  }

  const openInterviewModal = (app: any) => {
    setIntForm({ date: '', time: '', type: 'In-person', location: '', interviewer: '', notes: '' })
    setInterviewModal(app)
  }

  const openHireModal = (app: any) => {
    const positions = getPositions(app)
    const name = ((app.firstName || '') + '.' + (app.surname || '')).toLowerCase().replace(/\s+/g, '')
    setHireForm({
      position: positions[0] || '',
      startDate: '',
      employeeId: generateEmployeeId(),
      username: name,
      password: generatePassword(),
    })
    setHireModal(app)
  }

  // ── Render ──
  return (
    <DashboardLayout title="Recruitment">
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Applications', value: stats.total, icon: FileText, dark: true },
            { label: 'Pending', value: stats.pending, icon: Clock, dark: false },
            { label: 'Interviews', value: stats.interviews, icon: Calendar, dark: false },
            { label: 'Hired', value: stats.hired, icon: CheckCircle, dark: false },
            { label: 'Rejected', value: stats.rejected, icon: XCircle, dark: false },
          ].map((s, i) => (
            <Card key={i} className={s.dark ? 'bg-gray-900 text-white' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-xs ${s.dark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</p>
                    <p className="text-2xl font-bold mt-1">{s.value}</p>
                  </div>
                  <s.icon className={`h-8 w-8 ${s.dark ? 'text-gray-500' : 'text-gray-300'}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          {[
            { key: 'applications' as const, label: 'Applications', icon: FileText },
            { key: 'interviews' as const, label: 'Scheduled Interviews', icon: Calendar },
            { key: 'employees' as const, label: 'Employees', icon: Users },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : (
          <>
            {/* TAB 1: Applications */}
            {activeTab === 'applications' && (
              <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <Input
                      placeholder="Search by name, email, or reference..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Statuses</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="REVIEWED">Reviewed</SelectItem>
                      <SelectItem value="INTERVIEW">Interview</SelectItem>
                      <SelectItem value="HIRED">Hired</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Positions</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Drivers">Drivers</SelectItem>
                      <SelectItem value="Scheduler">Scheduler</SelectItem>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="Pupil Carer">Pupil Carer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Application Cards */}
                {filtered.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No applications found</p>
                      <p className="text-sm">Try adjusting your filters or check back later.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(app => (
                      <Card
                        key={app.id}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setDetailApp(app)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                              {initials(app.firstName + ' ' + app.surname)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium">{app.firstName} {app.surname}</p>
                                {statusBadge(app.status)}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                                <span>{app.email}</span>
                                {app.mobile && <span>{app.mobile}</span>}
                                <span>Ref: {app.reference || app.id?.slice(0, 8)}</span>
                                <span>{fmtDate(app.createdAt)}</span>
                              </div>
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {getPositions(app).map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            </div>
                            <Eye className="h-5 w-5 text-gray-400 shrink-0" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Scheduled Interviews */}
            {activeTab === 'interviews' && (
              <div className="space-y-3">
                {interviewApps.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No scheduled interviews</p>
                      <p className="text-sm">Schedule interviews from the Applications tab.</p>
                    </CardContent>
                  </Card>
                ) : (
                  interviewApps.map(app => {
                    const d = app.interviewDate ? new Date(app.interviewDate) : null
                    return (
                      <Card key={app.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            {d && (
                              <div className="text-center bg-purple-50 rounded-lg p-3 shrink-0">
                                <p className="text-2xl font-bold text-purple-700">{d.getDate()}</p>
                                <p className="text-xs text-purple-600 uppercase">
                                  {d.toLocaleDateString('en-GB', { month: 'short' })}
                                </p>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{app.firstName} {app.surname}</p>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {getPositions(app).map((p, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                                {d && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {fmtTime(app.interviewDate)}
                                  </span>
                                )}
                                {app.interviewType && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" /> {app.interviewType}
                                  </span>
                                )}
                                {app.interviewLocation && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {app.interviewLocation}
                                  </span>
                                )}
                                {app.interviewer && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" /> {app.interviewer}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setDetailApp(app)}>
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            )}

            {/* TAB 3: Employees */}
            {activeTab === 'employees' && (
              <div>
                {hiredApps.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center text-gray-500 dark:text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-lg font-medium">No employees yet</p>
                      <p className="text-sm">Hire candidates from the Applications tab.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hiredApps.map(app => (
                      <Card key={app.id}>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                              {initials(app.firstName + ' ' + app.surname)}
                            </div>
                            <div>
                              <p className="font-semibold">{app.firstName} {app.surname}</p>
                              {app.hiredPosition && (
                                <Badge variant="success" className="text-xs mt-1">{app.hiredPosition}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p className="flex items-center gap-2"><User className="h-3.5 w-3.5" /> {app.email}</p>
                            {app.mobile && <p className="flex items-center gap-2"><Clock className="h-3.5 w-3.5" /> {app.mobile}</p>}
                            {app.employeeId && <p className="flex items-center gap-2"><Briefcase className="h-3.5 w-3.5" /> {app.employeeId}</p>}
                            {app.startDate && <p className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> Starts: {fmtDate(app.startDate)}</p>}
                          </div>
                          {(app.loginUsername || app.loginPassword) && (
                            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                              <p className="font-medium text-gray-700 mb-1">Login Credentials</p>
                              {app.loginUsername && <p className="text-gray-600 dark:text-gray-400">Username: <span className="font-mono">{app.loginUsername}</span></p>}
                              {app.loginPassword && <p className="text-gray-600 dark:text-gray-400">Password: <span className="font-mono">{app.loginPassword}</span></p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══════════════ DETAIL MODAL ═══════════════ */}
      {detailApp && (
        <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
          <div className="min-h-full bg-white dark:bg-gray-900 lg:ml-64 mt-16">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Application Details</h2>
                <button onClick={() => setDetailApp(null)} className="p-2 hover:bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Application Summary */}
              <Card>
                <CardHeader className="pb-2"><h3 className="font-semibold">Application Summary</h3></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Reference</p>
                      <p className="font-medium">{detailApp.reference || detailApp.id?.slice(0, 8)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Status</p>
                      <div className="mt-1">{statusBadge(detailApp.status)}</div>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Submitted</p>
                      <p className="font-medium">{fmtDate(detailApp.createdAt)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400">Positions</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {getPositions(detailApp).map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Details (if scheduled) */}
              {detailApp.status === 'INTERVIEW' && detailApp.interviewDate && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold text-purple-700">Interview Details</h3></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div><p className="text-gray-500 dark:text-gray-400">Date</p><p className="font-medium">{fmtDate(detailApp.interviewDate)}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Time</p><p className="font-medium">{fmtTime(detailApp.interviewDate)}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Type</p><p className="font-medium">{detailApp.interviewType || '-'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Location</p><p className="font-medium">{detailApp.interviewLocation || '-'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Interviewer</p><p className="font-medium">{detailApp.interviewer || '-'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employee Account Info (if hired) */}
              {detailApp.status === 'HIRED' && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold text-green-700">Employee Account</h3></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      {detailApp.hiredPosition && <div><p className="text-gray-500 dark:text-gray-400">Position</p><p className="font-medium">{detailApp.hiredPosition}</p></div>}
                      {detailApp.employeeId && <div><p className="text-gray-500 dark:text-gray-400">Employee ID</p><p className="font-medium">{detailApp.employeeId}</p></div>}
                      {detailApp.startDate && <div><p className="text-gray-500 dark:text-gray-400">Start Date</p><p className="font-medium">{fmtDate(detailApp.startDate)}</p></div>}
                      {detailApp.loginUsername && <div><p className="text-gray-500 dark:text-gray-400">Username</p><p className="font-mono">{detailApp.loginUsername}</p></div>}
                      {detailApp.loginPassword && <div><p className="text-gray-500 dark:text-gray-400">Password</p><p className="font-mono">{detailApp.loginPassword}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Personal Details */}
              <Card>
                <CardHeader className="pb-2"><h3 className="font-semibold">Personal Details</h3></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div><p className="text-gray-500 dark:text-gray-400">First Name</p><p className="font-medium">{detailApp.firstName || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Surname</p><p className="font-medium">{detailApp.surname || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Email</p><p className="font-medium">{detailApp.email || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Mobile</p><p className="font-medium">{detailApp.mobile || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Date of Birth</p><p className="font-medium">{fmtDate(detailApp.dateOfBirth)}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Address</p><p className="font-medium">{detailApp.address || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Postcode</p><p className="font-medium">{detailApp.postcode || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">NI Number</p><p className="font-medium">{detailApp.niNumber || '-'}</p></div>
                    <div><p className="text-gray-500 dark:text-gray-400">Driving License</p><p className="font-medium">{detailApp.drivingLicense || '-'}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Next of Kin */}
              {(detailApp.nokName || detailApp.nokRelationship || detailApp.nokPhone) && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold">Next of Kin</h3></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div><p className="text-gray-500 dark:text-gray-400">Name</p><p className="font-medium">{detailApp.nokName || '-'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Relationship</p><p className="font-medium">{detailApp.nokRelationship || '-'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Phone</p><p className="font-medium">{detailApp.nokPhone || '-'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Medical History */}
              {(detailApp.medicalConditions || detailApp.medications || detailApp.allergies) && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold">Medical History</h3></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div><p className="text-gray-500 dark:text-gray-400">Conditions</p><p className="font-medium">{detailApp.medicalConditions || 'None'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Medications</p><p className="font-medium">{detailApp.medications || 'None'}</p></div>
                      <div><p className="text-gray-500 dark:text-gray-400">Allergies</p><p className="font-medium">{detailApp.allergies || 'None'}</p></div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Education & Training */}
              {(() => {
                const academic = safeParse(detailApp.academicHistory)
                if (!academic) return null
                const items = Array.isArray(academic) ? academic : [academic]
                return (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold">Education & Training</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                            {item.institution && <p className="font-medium">{item.institution}</p>}
                            {item.qualification && <p className="text-gray-600 dark:text-gray-400">{item.qualification}</p>}
                            {(item.startDate || item.endDate) && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.startDate || ''} - {item.endDate || 'Present'}</p>
                            )}
                            {item.grade && <p className="text-gray-500 dark:text-gray-400 text-xs">Grade: {item.grade}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Uploaded Documents */}
              {detailApp.files && detailApp.files.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold">Uploaded Documents</h3></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {detailApp.files.map((file: any, i: number) => (
                        <a
                          key={i}
                          href={file.url || file.path || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 rounded text-sm text-blue-600 hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {file.name || file.filename || `Document ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Employment History */}
              {(() => {
                const emp = safeParse(detailApp.employmentHistory)
                if (!emp) return null
                const items = Array.isArray(emp) ? emp : [emp]
                return (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold">Employment History</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {items.map((item: any, i: number) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                            {item.employer && <p className="font-medium">{item.employer}</p>}
                            {item.jobTitle && <p className="text-gray-600 dark:text-gray-400">{item.jobTitle}</p>}
                            {(item.startDate || item.endDate) && (
                              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.startDate || ''} - {item.endDate || 'Present'}</p>
                            )}
                            {item.duties && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{item.duties}</p>}
                            {item.reasonForLeaving && <p className="text-gray-500 dark:text-gray-400 text-xs">Reason for leaving: {item.reasonForLeaving}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Role-Specific Data */}
              {(() => {
                const rsd = safeParse(detailApp.roleSpecificData)
                if (!rsd) return null
                return (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold">Role-Specific Information</h3></CardHeader>
                    <CardContent>
                      <div className="space-y-4 text-sm">
                        {rsd.motivation && (
                          <div><p className="text-gray-500 dark:text-gray-400 font-medium">Motivation</p><p className="mt-1">{rsd.motivation}</p></div>
                        )}
                        {rsd.skills && (
                          <div><p className="text-gray-500 dark:text-gray-400 font-medium">Skills</p><p className="mt-1">{Array.isArray(rsd.skills) ? rsd.skills.join(', ') : rsd.skills}</p></div>
                        )}
                        {rsd.questions && (
                          <div>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">Questions</p>
                            {typeof rsd.questions === 'object' && !Array.isArray(rsd.questions) ? (
                              <div className="mt-1 space-y-2">
                                {Object.entries(rsd.questions).map(([q, a]: [string, any]) => (
                                  <div key={q} className="p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                    <p className="text-gray-600 dark:text-gray-400 font-medium">{q}</p>
                                    <p>{String(a)}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-1">{String(rsd.questions)}</p>
                            )}
                          </div>
                        )}
                        {rsd.experience && (
                          <div><p className="text-gray-500 dark:text-gray-400 font-medium">Experience</p><p className="mt-1">{rsd.experience}</p></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* References */}
              {(() => {
                const refs = safeParse(detailApp.references)
                if (!refs) return null
                const items = Array.isArray(refs) ? refs : [refs]
                return (
                  <Card>
                    <CardHeader className="pb-2"><h3 className="font-semibold">References</h3></CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((ref: any, i: number) => (
                          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                            {ref.name && <p className="font-medium">{ref.name}</p>}
                            {ref.relationship && <p className="text-gray-600 dark:text-gray-400">{ref.relationship}</p>}
                            {ref.company && <p className="text-gray-500 dark:text-gray-400">{ref.company}</p>}
                            {ref.email && <p className="text-gray-500 dark:text-gray-400">{ref.email}</p>}
                            {ref.phone && <p className="text-gray-500 dark:text-gray-400">{ref.phone}</p>}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Equal Opportunities */}
              {(detailApp.ethnicity || detailApp.gender || detailApp.disability || detailApp.religion) && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold">Equal Opportunities</h3></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {detailApp.ethnicity && <div><p className="text-gray-500 dark:text-gray-400">Ethnicity</p><p className="font-medium">{detailApp.ethnicity}</p></div>}
                      {detailApp.gender && <div><p className="text-gray-500 dark:text-gray-400">Gender</p><p className="font-medium">{detailApp.gender}</p></div>}
                      {detailApp.disability && <div><p className="text-gray-500 dark:text-gray-400">Disability</p><p className="font-medium">{detailApp.disability}</p></div>}
                      {detailApp.religion && <div><p className="text-gray-500 dark:text-gray-400">Religion</p><p className="font-medium">{detailApp.religion}</p></div>}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Rehabilitation of Offenders & Declaration */}
              {(detailApp.convictions !== undefined || detailApp.declaration !== undefined) && (
                <Card>
                  <CardHeader className="pb-2"><h3 className="font-semibold">Rehabilitation of Offenders & Declaration</h3></CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {detailApp.convictions !== undefined && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Unspent Convictions</p>
                          <p className="font-medium">{detailApp.convictions || 'None declared'}</p>
                        </div>
                      )}
                      {detailApp.convictionDetails && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Details</p>
                          <p className="font-medium">{detailApp.convictionDetails}</p>
                        </div>
                      )}
                      {detailApp.declaration !== undefined && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Declaration Signed</p>
                          <p className="font-medium">{detailApp.declaration ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                      {detailApp.declarationDate && (
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Declaration Date</p>
                          <p className="font-medium">{fmtDate(detailApp.declarationDate)}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Internal Notes */}
              <Card>
                <CardHeader className="pb-2"><h3 className="font-semibold">Internal Notes</h3></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(() => {
                      const notes = safeParse(detailApp.notes)
                      const notesList = Array.isArray(notes) ? notes : notes ? [notes] : []
                      return notesList.length > 0 ? (
                        notesList.map((note: any, i: number) => (
                          <div key={i} className="p-3 bg-yellow-50 rounded-lg text-sm">
                            {typeof note === 'string' ? (
                              <p>{note}</p>
                            ) : (
                              <>
                                <p>{note.text || note.content}</p>
                                {note.date && <p className="text-xs text-gray-400 mt-1">{fmtDate(note.date)} {note.author && `- ${note.author}`}</p>}
                              </>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 dark:text-gray-500 text-sm">No notes yet.</p>
                      )
                    })()}
                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={e => setNewNote(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddNote(detailApp) }}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAddNote(detailApp)}
                        disabled={actionLoading || !newNote.trim()}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Footer Actions */}
              <div className="flex flex-wrap gap-3 pb-8 border-t pt-6">
                {detailApp.status === 'PENDING' && (
                  <Button onClick={() => handleMarkReviewed(detailApp)} disabled={actionLoading}>
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Mark as Reviewed
                  </Button>
                )}
                {detailApp.status !== 'HIRED' && detailApp.status !== 'REJECTED' && (
                  <>
                    <Button variant="outline" onClick={() => openInterviewModal(detailApp)} disabled={actionLoading}>
                      <Calendar className="h-4 w-4 mr-2" /> Schedule Interview
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => openHireModal(detailApp)} disabled={actionLoading}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Hire Candidate
                    </Button>
                    <Button variant="destructive" onClick={() => handleReject(detailApp)} disabled={actionLoading}>
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => setDetailApp(null)} className="ml-auto">Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ INTERVIEW SCHEDULING MODAL ═══════════════ */}
      {interviewModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-4">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Schedule Interview</h3>
                <button onClick={() => setInterviewModal(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <p className="font-medium">{interviewModal.firstName} {interviewModal.surname}</p>
                <p className="text-gray-500 dark:text-gray-400">{interviewModal.email}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {getPositions(interviewModal).map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <Input type="date" value={intForm.date} onChange={e => setIntForm({ ...intForm, date: e.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Time</label>
                    <Input type="time" value={intForm.time} onChange={e => setIntForm({ ...intForm, time: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <Select value={intForm.type} onValueChange={v => setIntForm({ ...intForm, type: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="In-person">In-person</SelectItem>
                      <SelectItem value="Phone">Phone</SelectItem>
                      <SelectItem value="Video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Location / Link</label>
                  <Input value={intForm.location} onChange={e => setIntForm({ ...intForm, location: e.target.value })} className="mt-1" placeholder="Office address or video link" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Interviewer(s)</label>
                  <Input value={intForm.interviewer} onChange={e => setIntForm({ ...intForm, interviewer: e.target.value })} className="mt-1" placeholder="Interviewer names" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                  <Input value={intForm.notes} onChange={e => setIntForm({ ...intForm, notes: e.target.value })} className="mt-1" placeholder="Additional notes" />
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setInterviewModal(null)}>Cancel</Button>
                <Button
                  onClick={handleScheduleInterview}
                  disabled={actionLoading || !intForm.date || !intForm.time}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Schedule Interview
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ═══════════════ HIRE MODAL ═══════════════ */}
      {hireModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-lg w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-4">
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Hire Candidate</h3>
                <button onClick={() => setHireModal(null)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <p className="font-medium">{hireModal.firstName} {hireModal.surname}</p>
                <p className="text-gray-500 dark:text-gray-400">{hireModal.email}</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Position to Hire For</label>
                  <Select value={hireForm.position} onValueChange={v => setHireForm({ ...hireForm, position: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {getPositions(hireModal).map((p, i) => (
                        <SelectItem key={i} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                  <Input type="date" value={hireForm.startDate} onChange={e => setHireForm({ ...hireForm, startDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee ID</label>
                  <Input value={hireForm.employeeId} onChange={e => setHireForm({ ...hireForm, employeeId: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Login Username</label>
                  <Input value={hireForm.username} onChange={e => setHireForm({ ...hireForm, username: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={hireForm.password} onChange={e => setHireForm({ ...hireForm, password: e.target.value })} className="flex-1 font-mono" />
                    <Button variant="outline" type="button" onClick={() => setHireForm({ ...hireForm, password: generatePassword() })}>
                      Generate
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setHireModal(null)}>Cancel</Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleHire}
                  disabled={actionLoading || !hireForm.position || !hireForm.startDate || !hireForm.username || !hireForm.password}
                >
                  {actionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Hire & Create Employee Account
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* ═══════════════ CREDENTIALS MODAL ═══════════════ */}
      {credentialsModal && (
        <div className="fixed inset-0 z-[70] bg-black/50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 sm:p-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[calc(100vh-2rem)] overflow-y-auto my-4">
            <div className="p-6 space-y-5">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-bold">Employee Account Created</h3>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Name</span>
                  <span className="font-medium">{credentialsModal.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Position</span>
                  <span className="font-medium">{credentialsModal.position}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Employee ID</span>
                  <span className="font-mono">{credentialsModal.employeeId}</span>
                </div>
                <hr />
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Username</span>
                  <span className="font-mono font-medium">{credentialsModal.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Password</span>
                  <span className="font-mono font-medium">{credentialsModal.password}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const text = `Employee Credentials\n\nName: ${credentialsModal.name}\nPosition: ${credentialsModal.position}\nEmployee ID: ${credentialsModal.employeeId}\nUsername: ${credentialsModal.username}\nPassword: ${credentialsModal.password}`
                    navigator.clipboard.writeText(text)
                    toast.success('Credentials copied to clipboard')
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" /> Copy Credentials
                </Button>
                <Button className="flex-1" onClick={() => setCredentialsModal(null)}>
                  Done
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
