'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import DashboardLayout from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Car, CheckCircle2, ClipboardList, Loader2, Search, ShieldAlert } from 'lucide-react'

const TYPE_OPTIONS = [
  ['all', 'All types'],
  ['DELAY', 'Delay'],
  ['VEHICLE_ISSUE', 'Vehicle issue'],
  ['BEHAVIOURAL_INCIDENT', 'Behavioural incident'],
  ['PUPIL_LEFT_BEHIND', 'Pupil left behind'],
  ['SAFEGUARDING', 'Safeguarding'],
  ['MEDICAL', 'Medical'],
  ['OTHER', 'Other'],
]

const SEVERITY_OPTIONS = [
  ['all', 'All severities'],
  ['LOW', 'Low'],
  ['MEDIUM', 'Medium'],
  ['HIGH', 'High'],
  ['CRITICAL', 'Critical'],
]

const STATUS_OPTIONS = [
  ['all', 'All statuses'],
  ['OPEN', 'Open'],
  ['INVESTIGATING', 'Investigating'],
  ['RESOLVED', 'Resolved'],
  ['CLOSED', 'Closed'],
]

type Incident = {
  id: string
  reference: string
  incidentType: string
  severity: string
  status: string
  title: string
  description: string
  parentVisible: boolean
  parentNotified: boolean
  createdAt: string
  resolvedAt?: string | null
  driver?: { user?: { name?: string | null } } | null
  schedule?: { routeName?: string; direction?: string | null; school?: { name?: string } | null } | null
  pupil?: { fullName?: string; parent?: { user?: { name?: string | null; phone?: string | null } } } | null
  vehicle?: { regPlate?: string; make?: string | null; model?: string | null } | null
  attachments?: Array<{ id: string }>
}

const initialFilters = {
  type: 'all',
  severity: 'all',
  status: 'all',
  dateFrom: '',
  dateTo: '',
}

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

function badgeClasses(value: string) {
  if (value === 'CRITICAL') return 'bg-red-700 text-white'
  if (value === 'HIGH') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  if (value === 'MEDIUM' || value === 'INVESTIGATING') return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
  if (value === 'RESOLVED' || value === 'CLOSED') return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

export default function AdminIncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.type !== 'all') params.set('type', filters.type)
    if (filters.severity !== 'all') params.set('severity', filters.severity)
    if (filters.status !== 'all') params.set('status', filters.status)
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) params.set('dateTo', filters.dateTo)
    return params.toString()
  }, [filters])

  async function fetchIncidents() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/admin/incidents${query ? `?${query}` : ''}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch incidents')
      setIncidents(data.incidents || [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to fetch incidents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [query])

  const stats = useMemo(() => ({
    total: incidents.length,
    open: incidents.filter(incident => incident.status === 'OPEN' || incident.status === 'INVESTIGATING').length,
    highPriority: incidents.filter(incident => incident.severity === 'HIGH' || incident.severity === 'CRITICAL').length,
    notified: incidents.filter(incident => incident.parentNotified).length,
  }), [incidents])

  return (
    <DashboardLayout title="Incident Management">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Incident management</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review operational, safety, safeguarding, vehicle, and pupil welfare incidents across all school transport routes.
            </p>
          </div>
          <Button variant="outline" onClick={fetchIncidents} disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Refresh</Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><ClipboardList className="h-8 w-8 text-blue-600" /><div><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{stats.total}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><AlertTriangle className="h-8 w-8 text-amber-600" /><div><p className="text-sm text-gray-500">Open</p><p className="text-2xl font-bold">{stats.open}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><ShieldAlert className="h-8 w-8 text-red-600" /><div><p className="text-sm text-gray-500">High priority</p><p className="text-2xl font-bold">{stats.highPriority}</p></div></div></CardContent></Card>
          <Card><CardContent className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="h-8 w-8 text-green-600" /><div><p className="text-sm text-gray-500">Parents notified</p><p className="text-2xl font-bold">{stats.notified}</p></div></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter by incident type, severity, workflow status, or date range.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="space-y-2"><Label>Type</Label><Select value={filters.type} onValueChange={value => setFilters(prev => ({ ...prev, type: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TYPE_OPTIONS.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Severity</Label><Select value={filters.severity} onValueChange={value => setFilters(prev => ({ ...prev, severity: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{SEVERITY_OPTIONS.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Status</Label><Select value={filters.status} onValueChange={value => setFilters(prev => ({ ...prev, status: value }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(([value, text]) => <SelectItem key={value} value={value}>{text}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="incident-from">From</Label><Input id="incident-from" type="date" value={filters.dateFrom} onChange={event => setFilters(prev => ({ ...prev, dateFrom: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="incident-to">To</Label><Input id="incident-to" type="date" value={filters.dateTo} onChange={event => setFilters(prev => ({ ...prev, dateTo: event.target.value }))} /></div>
            </div>
          </CardContent>
        </Card>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">{error}</div>}

        <Card>
          <CardHeader>
            <CardTitle>Incident queue</CardTitle>
            <CardDescription>Select an incident to review details, attachments, parent visibility, and workflow status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading incidents...</div>
            ) : incidents.length === 0 ? (
              <p className="text-sm text-gray-500">No incidents match the selected filters.</p>
            ) : incidents.map(incident => (
              <Link key={incident.id} href={`/admin/incidents/${incident.id}`} className="block rounded-lg border border-gray-200 p-4 transition hover:border-gray-400 hover:bg-gray-50 dark:border-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-900">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{incident.reference}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClasses(incident.severity)}`}>{incident.severity}</span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeClasses(incident.status)}`}>{label(incident.status)}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">{label(incident.incidentType)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{incident.title}</h3>
                      <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">{incident.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span>{new Date(incident.createdAt).toLocaleString()}</span>
                      <span>{incident.schedule?.routeName || 'No route'}</span>
                      <span>{incident.pupil?.fullName || 'No individual pupil'}</span>
                      <span>{incident.driver?.user?.name || 'No driver'}</span>
                    </div>
                  </div>
                  <div className="grid min-w-56 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2"><Car className="h-4 w-4" /> {incident.vehicle?.regPlate || incident.schedule?.routeName || 'Context pending'}</div>
                    <div>{incident.parentVisible ? (incident.parentNotified ? 'Parent notification sent' : 'Parent-visible, not yet notified') : 'Internal only'}</div>
                    <div>{incident.attachments?.length || 0} attachment(s)</div>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
