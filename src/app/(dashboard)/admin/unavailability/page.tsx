'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertTriangle,
  User,
  Calendar,
  CheckCircle,
  Clock,
  Filter
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DashboardLayout from '@/components/layout/dashboard-layout'

interface UnavailabilityEntry {
  id: string
  date: string
  reason: string
  status: string
  adminNotified: boolean
  parentsNotified: boolean
  substituteDriverId: string | null
  createdAt: string
  driver: {
    id: string
    user: { name: string; email: string; phone: string | null }
  }
}

interface Driver {
  id: string
  user: { name: string }
  licenceClass: string | null
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  SUBSTITUTE_ASSIGNED: 'bg-green-100 text-green-700',
  RESOLVED: 'bg-gray-100 text-gray-600'
}

export default function UnavailabilityPage() {
  const [entries, setEntries] = useState<UnavailabilityEntry[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<UnavailabilityEntry | null>(null)
  const [substituteId, setSubstituteId] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => { fetchData() }, [statusFilter])

  async function fetchData() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      const [entriesRes, driversRes] = await Promise.all([
        fetch(`/api/admin/unavailability?${params}`),
        fetch('/api/admin/drivers')
      ])
      const entriesData = await entriesRes.json()
      const driversData = await driversRes.json()
      setEntries(Array.isArray(entriesData) ? entriesData : [])
      setDrivers(Array.isArray(driversData) ? driversData : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate() {
    if (!selectedEntry || !newStatus) return
    setUpdating(true)
    try {
      const res = await fetch('/api/admin/unavailability', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedEntry.id,
          status: newStatus,
          substituteDriverId: substituteId || undefined
        })
      })
      if (res.ok) {
        setSelectedEntry(null)
        setSubstituteId('')
        setNewStatus('')
        fetchData()
      }
    } finally {
      setUpdating(false)
    }
  }

  const stats = {
    pending: entries.filter(e => e.status === 'PENDING').length,
    assigned: entries.filter(e => e.status === 'SUBSTITUTE_ASSIGNED').length,
    resolved: entries.filter(e => e.status === 'RESOLVED').length
  }

  return (
    <DashboardLayout title="Driver Unavailability">
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Driver Unavailability</h1>
        <p className="text-slate-500">Manage driver absence reports and substitute assignments</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-yellow-200">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Pending Review</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Substitute Assigned</p>
            <p className="text-2xl font-bold text-green-600">{stats.assigned}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">Resolved</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.resolved}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-slate-400" />
        {['', 'PENDING', 'SUBSTITUTE_ASSIGNED', 'RESOLVED'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>No unavailability records found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map(entry => (
            <Card
              key={entry.id}
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                entry.status === 'PENDING' ? 'border-yellow-300' : ''
              }`}
              onClick={() => {
                setSelectedEntry(entry)
                setNewStatus(entry.status)
                setSubstituteId(entry.substituteDriverId || '')
              }}
            >
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">{entry.driver.user.name}</span>
                      <Badge className={STATUS_COLORS[entry.status] || 'bg-gray-100'}>
                        {entry.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">
                        {new Date(entry.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{entry.reason}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Reported: {new Date(entry.createdAt).toLocaleDateString('en-GB')}
                      </span>
                      {entry.adminNotified && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Admin notified
                        </span>
                      )}
                      {entry.parentsNotified && (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Parents notified
                        </span>
                      )}
                    </div>
                  </div>
                  <AlertTriangle className={`w-5 h-5 ${entry.status === 'PENDING' ? 'text-orange-400' : 'text-slate-300'}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Action Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Unavailability</DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4 pt-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedEntry.driver.user.name}</p>
                <p className="text-slate-500">
                  {new Date(selectedEntry.date).toLocaleDateString('en-GB', { dateStyle: 'full' })}
                </p>
                <p className="text-slate-600 dark:text-slate-400 mt-1">{selectedEntry.reason}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">🟡 Pending</SelectItem>
                    <SelectItem value="SUBSTITUTE_ASSIGNED">🟢 Substitute Assigned</SelectItem>
                    <SelectItem value="RESOLVED">✅ Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newStatus === 'SUBSTITUTE_ASSIGNED' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Assign Substitute Driver</label>
                  <Select value={substituteId} onValueChange={setSubstituteId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select substitute driver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers
                        .filter(d => d.id !== selectedEntry.driver.id)
                        .map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.user.name} {d.licenceClass && `(${d.licenceClass})`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Assigning a substitute will automatically notify all affected parents via SMS and email.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setSelectedEntry(null)}>Cancel</Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updating || !newStatus}
                >
                  {updating ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </DashboardLayout>
  )
}
