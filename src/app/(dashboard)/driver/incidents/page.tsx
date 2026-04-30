'use client'

import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Camera, Clock, FileWarning, Loader2, ShieldAlert } from 'lucide-react'

const INCIDENT_TYPES = [
  { value: 'DELAY', label: 'Delay' },
  { value: 'VEHICLE_ISSUE', label: 'Vehicle issue' },
  { value: 'BEHAVIOURAL_INCIDENT', label: 'Behavioural incident' },
  { value: 'PUPIL_LEFT_BEHIND', label: 'Pupil left behind concern' },
  { value: 'SAFEGUARDING', label: 'Safeguarding' },
  { value: 'MEDICAL', label: 'Medical' },
  { value: 'OTHER', label: 'Other' },
]

const SEVERITIES = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
]

type TripOption = {
  id: string
  status: string
  timestamp: string
  schedule?: { id: string; routeName: string; direction?: string | null }
  pupil?: { id: string; fullName: string } | null
  vehicle?: { id: string; regPlate: string } | null
}

type ScheduleOption = {
  id: string
  routeName: string
  direction?: string | null
  vehicle?: { id: string; regPlate: string } | null
  seatAssignments?: Array<{ pupil: { id: string; fullName: string } }>
}

type Incident = {
  id: string
  reference: string
  incidentType: string
  severity: string
  status: string
  title: string
  description: string
  createdAt: string
  parentNotified: boolean
  schedule?: { routeName: string; direction?: string | null } | null
  pupil?: { fullName: string } | null
  vehicle?: { regPlate: string } | null
  attachments?: Array<{ id: string; fileName: string }>
}

type FilePayload = { fileName: string; fileData: string; caption?: string }

const emptyForm = {
  incidentType: 'DELAY',
  severity: 'MEDIUM',
  title: '',
  description: '',
  scheduleId: 'none',
  tripLogId: 'none',
  pupilId: 'none',
  parentVisible: 'true',
}

function badgeClasses(value: string) {
  if (value === 'CRITICAL' || value === 'HIGH') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  if (value === 'MEDIUM' || value === 'INVESTIGATING') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  if (value === 'RESOLVED' || value === 'CLOSED') return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

function formatIncidentLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

export default function DriverIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [trips, setTrips] = useState<TripOption[]>([])
  const [schedules, setSchedules] = useState<ScheduleOption[]>([])
  const [form, setForm] = useState(emptyForm)
  const [attachment, setAttachment] = useState<FilePayload | null>(null)
  const [attachmentCaption, setAttachmentCaption] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedSchedule = useMemo(
    () => schedules.find(schedule => schedule.id === form.scheduleId),
    [form.scheduleId, schedules]
  )

  const pupilOptions = useMemo(() => {
    const fromSchedule = selectedSchedule?.seatAssignments?.map(assignment => assignment.pupil) || []
    const fromTrips = trips.map(trip => trip.pupil).filter((pupil): pupil is { id: string; fullName: string } => Boolean(pupil))
    return Array.from(new Map([...fromSchedule, ...fromTrips].map(pupil => [pupil.id, pupil])).values())
  }, [selectedSchedule, trips])

  async function loadData() {
    setLoading(true)
    try {
      const [incidentRes, scheduleRes, tripRes] = await Promise.all([
        fetch('/api/driver/incidents'),
        fetch('/api/driver/schedule'),
        fetch('/api/driver/trips?limit=25'),
      ])

      if (incidentRes.ok) {
        const data = await incidentRes.json()
        setIncidents(data.incidents || [])
      }

      if (scheduleRes.ok) {
        const data = await scheduleRes.json()
        setSchedules(data.schedules || [])
      }

      if (tripRes.ok) {
        const data = await tripRes.json()
        setTrips(data.trips || [])
      }
    } catch (loadError) {
      console.error(loadError)
      setError('Unable to load incident reporting context.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  async function readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function handleFileChange(file?: File) {
    if (!file) {
      setAttachment(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Attachment must be 10MB or smaller.')
      return
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setError('Only PDF, JPEG, PNG, and WebP attachments are supported.')
      return
    }

    const fileData = await readFile(file)
    setAttachment({ fileName: file.name, fileData })
    setError(null)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setMessage(null)

    try {
      const payload = {
        incidentType: form.incidentType,
        severity: form.severity,
        title: form.title,
        description: form.description,
        scheduleId: form.scheduleId === 'none' ? undefined : form.scheduleId,
        tripLogId: form.tripLogId === 'none' ? undefined : form.tripLogId,
        pupilId: form.pupilId === 'none' ? undefined : form.pupilId,
        parentVisible: form.parentVisible === 'true',
        attachment: attachment ? { ...attachment, caption: attachmentCaption || undefined } : undefined,
      }

      const response = await fetch('/api/driver/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Incident could not be submitted.')
      }

      setMessage(`Incident ${data.incident?.reference || ''} has been submitted.`)
      setForm(emptyForm)
      setAttachment(null)
      setAttachmentCaption('')
      await loadData()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Incident could not be submitted.')
    } finally {
      setSaving(false)
    }
  }

  const openCount = incidents.filter(incident => incident.status === 'OPEN' || incident.status === 'INVESTIGATING').length
  const criticalCount = incidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL').length

  return (
    <DashboardLayout title="Incident Reporting">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Incident reporting</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Record delays, safety events, pupil welfare concerns, vehicle issues, and supporting evidence from your route.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><FileWarning className="h-8 w-8 text-blue-600" /><div><p className="text-sm text-gray-500">Total reports</p><p className="text-2xl font-bold">{incidents.length}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><Clock className="h-8 w-8 text-amber-600" /><div><p className="text-sm text-gray-500">Open / investigating</p><p className="text-2xl font-bold">{openCount}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><ShieldAlert className="h-8 w-8 text-red-600" /><div><p className="text-sm text-gray-500">High priority</p><p className="text-2xl font-bold">{criticalCount}</p></div></div></CardContent></Card>
        </div>

        {(message || error) && (
          <div className={`rounded-lg border p-4 text-sm ${error ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200'}`}>
            {error || message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Submit a structured incident report</CardTitle>
              <CardDescription>High and critical parent-visible reports automatically notify affected parents when pupil context is available.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Incident type</Label>
                    <Select value={form.incidentType} onValueChange={value => setForm(prev => ({ ...prev, incidentType: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INCIDENT_TYPES.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={value => setForm(prev => ({ ...prev, severity: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map(severity => <SelectItem key={severity.value} value={severity.value}>{severity.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-title">Title</Label>
                  <Input id="incident-title" value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} placeholder="Short summary for control room review" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident-description">Description and immediate action</Label>
                  <textarea id="incident-description" value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} className="min-h-32 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" placeholder="Record what happened, who was affected, location, time, and any immediate safeguarding or operational action taken." required />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Route / schedule</Label>
                    <Select value={form.scheduleId} onValueChange={value => setForm(prev => ({ ...prev, scheduleId: value, pupilId: 'none' }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No route selected</SelectItem>
                        {schedules.map(schedule => <SelectItem key={schedule.id} value={schedule.id}>{schedule.routeName} {schedule.direction ? `(${schedule.direction})` : ''}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recent trip log</Label>
                    <Select value={form.tripLogId} onValueChange={value => setForm(prev => ({ ...prev, tripLogId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No trip log selected</SelectItem>
                        {trips.map(trip => <SelectItem key={trip.id} value={trip.id}>{trip.schedule?.routeName || 'Trip'} · {trip.pupil?.fullName || trip.status}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Affected pupil</Label>
                    <Select value={form.pupilId} onValueChange={value => setForm(prev => ({ ...prev, pupilId: value }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No individual pupil</SelectItem>
                        {pupilOptions.map(pupil => <SelectItem key={pupil.id} value={pupil.id}>{pupil.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Parent visibility</Label>
                    <Select value={form.parentVisible} onValueChange={value => setForm(prev => ({ ...prev, parentVisible: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Visible to affected parents when notified</SelectItem>
                        <SelectItem value="false">Internal operations only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incident-attachment">Photo or document evidence</Label>
                    <Input id="incident-attachment" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={event => handleFileChange(event.target.files?.[0])} />
                  </div>
                </div>

                {attachment && (
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium"><Camera className="h-4 w-4" /> {attachment.fileName}</div>
                    <Input value={attachmentCaption} onChange={event => setAttachmentCaption(event.target.value)} placeholder="Optional attachment caption" />
                  </div>
                )}

                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                  Submit incident report
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent reports</CardTitle>
              <CardDescription>Your latest incident reports and workflow status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading incidents...</div>
              ) : incidents.length === 0 ? (
                <p className="text-sm text-gray-500">No incident reports have been submitted yet.</p>
              ) : incidents.slice(0, 8).map(incident => (
                <div key={incident.id} className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{incident.reference}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{incident.title}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClasses(incident.severity)}`}>{incident.severity}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2 py-1 ${badgeClasses(incident.status)}`}>{formatIncidentLabel(incident.status)}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700 dark:bg-gray-800 dark:text-gray-300">{formatIncidentLabel(incident.incidentType)}</span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{incident.schedule?.routeName || 'No route'} · {incident.pupil?.fullName || 'No individual pupil'} · {new Date(incident.createdAt).toLocaleString()}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
