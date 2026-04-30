"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RotateCcw, Search, ShieldCheck } from "lucide-react"

type AuditLogRow = {
  id: string
  action: string
  entity: string
  entityId?: string | null
  before?: string | null
  after?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  timestamp: string
  user?: { id: string; name: string | null; email: string; role: string } | null
}

type AuditResponse = {
  logs: AuditLogRow[]
  filters?: { actions: string[]; entities: string[] }
}

const actionColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  CREATE: "default",
  UPDATE: "secondary",
  DELETE: "destructive",
}

function formatSnapshot(value?: string | null) {
  if (!value) return "—"
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (_error) {
    return value
  }
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [actions, setActions] = useState<string[]>([])
  const [entities, setEntities] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filters, setFilters] = useState({ q: "", action: "", entity: "", from: "", to: "" })

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    params.set("limit", "150")
    return params.toString()
  }, [filters])

  const loadLogs = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/audit?${queryString}`)
      const data: AuditResponse | AuditLogRow[] = await response.json()
      if (Array.isArray(data)) {
        setLogs(data)
      } else {
        setLogs(Array.isArray(data.logs) ? data.logs : [])
        setActions(data.filters?.actions || [])
        setEntities(data.filters?.entities || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  const resetFilters = () => setFilters({ q: "", action: "", entity: "", from: "", to: "" })

  return (
    <DashboardLayout title="Audit Log">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <ShieldCheck className="h-4 w-4" />
          <span>Sensitive admin actions are recorded with actor, timestamp, target, request origin, and before/after snapshots.</span>
        </div>

        <Card>
          <CardHeader><CardTitle>Filter audit records</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="audit-search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input id="audit-search" className="pl-9" placeholder="Action, entity, actor, IP..." value={filters.q} onChange={event => setFilters(prev => ({ ...prev, q: event.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-action">Action</Label>
                <select id="audit-action" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" value={filters.action} onChange={event => setFilters(prev => ({ ...prev, action: event.target.value }))}>
                  <option value="">All actions</option>
                  {actions.map(action => <option key={action} value={action}>{action}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-entity">Entity</Label>
                <select id="audit-entity" className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900" value={filters.entity} onChange={event => setFilters(prev => ({ ...prev, entity: event.target.value }))}>
                  <option value="">All entities</option>
                  {entities.map(entity => <option key={entity} value={entity}>{entity}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-from">From</Label>
                <Input id="audit-from" type="date" value={filters.from} onChange={event => setFilters(prev => ({ ...prev, from: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="audit-to">To</Label>
                <Input id="audit-to" type="date" value={filters.to} onChange={event => setFilters(prev => ({ ...prev, to: event.target.value }))} />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="outline" onClick={resetFilters}><RotateCcw className="h-4 w-4 mr-2" />Reset filters</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Audit Trail ({logs.length} records)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No audit records match the selected filters.</p>
            ) : (
              <div className="space-y-3">
                {logs.map(log => (
                  <div key={log.id} className="border border-gray-100 dark:border-gray-800 rounded-lg bg-white dark:bg-gray-900">
                    <button type="button" onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="w-full text-left flex items-start gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
                      <Badge variant={actionColor[log.action] || "outline"} className="mt-0.5 flex-shrink-0">
                        {log.action}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{log.user?.name || 'System'}</p>
                          <span className="text-gray-400 dark:text-gray-500 text-xs">·</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{log.entity}</p>
                          {log.entityId && <p className="text-xs text-gray-400 font-mono">{log.entityId}</p>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString('en-GB')} · {log.ipAddress || 'IP unavailable'}</p>
                      </div>
                    </button>
                    {expanded === log.id && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 border-t border-gray-100 dark:border-gray-800 p-3 text-xs">
                        <div>
                          <p className="font-semibold mb-1">Before</p>
                          <pre className="max-h-64 overflow-auto rounded bg-gray-50 dark:bg-gray-950 p-3 whitespace-pre-wrap">{formatSnapshot(log.before)}</pre>
                        </div>
                        <div>
                          <p className="font-semibold mb-1">After</p>
                          <pre className="max-h-64 overflow-auto rounded bg-gray-50 dark:bg-gray-950 p-3 whitespace-pre-wrap">{formatSnapshot(log.after)}</pre>
                        </div>
                        <div className="lg:col-span-2 text-gray-500 break-all">
                          <strong>User agent:</strong> {log.userAgent || 'Unavailable'}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
