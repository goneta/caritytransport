"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldCheck } from "lucide-react"

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/audit").then(r => r.json()).then(d => { setLogs(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const actionColor: Record<string, string> = {
    CREATE: "success", UPDATE: "warning", DELETE: "destructive"
  }

  return (
    <DashboardLayout title="Audit Log">
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <ShieldCheck className="h-4 w-4" />
          <span>All platform actions are recorded here with full user, timestamp, and data trail.</span>
        </div>

        <Card>
          <CardHeader><CardTitle>Audit Trail ({logs.length} records)</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No audit records</p>
            ) : (
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-4 p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800">
                    <Badge variant={actionColor[log.action] as any || "secondary"} className="mt-0.5 flex-shrink-0">
                      {log.action}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm">{log.user?.name || 'System'}</p>
                        <span className="text-gray-400 dark:text-gray-500 text-xs">·</span>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{log.entity}</p>
                        {log.entityId && <p className="text-xs text-gray-400 font-mono">{log.entityId.substring(0, 8)}...</p>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{new Date(log.timestamp).toLocaleString('en-GB')}</p>
                    </div>
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
