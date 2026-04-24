"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Bus, Route, Users, Clock, MapPin, Phone, AlertTriangle } from "lucide-react"
import { Loader2 } from "lucide-react"
import UserQRCard from "@/components/shared/user-qr-card"

export default function DriverDashboard() {
  const { data: session } = useSession()
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/schedules")
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : []
        setSchedules(arr.filter((s: any) => s.status !== 'CANCELLED'))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [session?.user?.id])

  return (
    <DashboardLayout title="Driver Dashboard">
      <div className="space-y-6">
        <div className="bg-black text-white rounded-xl p-6">
          <p className="text-gray-400 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-1">{session?.user?.name}</h2>
          <p className="text-gray-300 mt-2 text-sm">Check your routes and passenger manifest below</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{schedules.length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Routes</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{schedules.filter(s => s.status === 'SCHEDULED').length}</p><p className="text-xs text-gray-500 dark:text-gray-400">Scheduled</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-3xl font-bold">{schedules.reduce((sum, s) => sum + (s._count?.seatAssignments || 0), 0)}</p><p className="text-xs text-gray-500 dark:text-gray-400">Total Pupils</p></CardContent></Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <UserQRCard userId={session?.user?.id || ""} userName={session?.user?.name || ""} />
          </div>
          <div className="lg:col-span-2">
            <Card>
              <CardHeader><CardTitle>My Routes</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : schedules.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-6">No routes assigned</p>
                ) : (
                  <div className="space-y-3">
                    {schedules.slice(0, 5).map(sched => (
                      <div key={sched.id} className="flex items-center gap-3 p-4 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center flex-shrink-0">
                          <Bus className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{sched.routeName}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{sched.departureTime}</span>
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{sched._count?.seatAssignments || 0} pupils</span>
                            <span>{sched.direction === 'HOME_TO_SCHOOL' ? '\u2192 School' : '\u2192 Home'}</span>
                          </div>
                        </div>
                        <Badge variant={sched.status === 'ACTIVE' ? 'success' : 'secondary'}>{sched.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
