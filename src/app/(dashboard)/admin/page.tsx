"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Bus, Route, UserCheck, AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import { useSession } from "next-auth/react"
import UserQRCard from "@/components/shared/user-qr-card"

interface DashboardData {
  metrics: {
    totalPupils: number
    activeRoutes: number
    vehiclesInUse: number
    driversOnDuty: number
    totalParents: number
  }
  pendingActions: {
    pendingParents: number
    expiringLicences: number
    expiringInsurance: number
    fullVehicles: number
  }
  recentActivity: any[]
  todaySchedules: any[]
  expiringLicences: any[]
  expiringInsurance: any[]
}

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-700",
  CANCELLED: "bg-red-100 text-red-800",
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <DashboardLayout title="Dashboard">
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black dark:border-white" />
      </div>
    </DashboardLayout>
  )

  const metrics = data?.metrics
  const pending = data?.pendingActions

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-8 animate-fade-in">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Pupils", value: metrics?.totalPupils || 0, icon: Users, href: "/admin/pupils" },
            { label: "Active Routes", value: metrics?.activeRoutes || 0, icon: Route, href: "/admin/schedules" },
            { label: "Vehicles In Use", value: metrics?.vehiclesInUse || 0, icon: Bus, href: "/admin/vehicles" },
            { label: "Drivers On Duty", value: metrics?.driversOnDuty || 0, icon: UserCheck, href: "/admin/drivers" },
            { label: "Total Parents", value: metrics?.totalParents || 0, icon: Users, href: "/admin/parents" },
          ].map((m, i) => (
            <Link key={i} href={m.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{m.label}</p>
                      <p className="text-3xl font-bold mt-1">{m.value}</p>
                    </div>
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <m.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Identity QR Code */}
        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <UserQRCard userId={session?.user?.id || ""} userName={session?.user?.name || ""} />
          </div>
        </div>

        {/* Pending Actions */}
        {(pending?.pendingParents || 0) + (pending?.expiringLicences || 0) + (pending?.expiringInsurance || 0) > 0 && (
          <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="h-5 w-5" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(pending?.pendingParents || 0) > 0 && (
                  <Link href="/admin/parents?status=PENDING">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800 hover:shadow-sm">
                      <Users className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-sm">{pending?.pendingParents} Pending Parents</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Awaiting verification</p>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400 dark:text-gray-500" />
                    </div>
                  </Link>
                )}
                {(pending?.expiringLicences || 0) > 0 && (
                  <Link href="/admin/drivers">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800 hover:shadow-sm">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-sm">{pending?.expiringLicences} Expiring Licences</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Within 60 days</p>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400 dark:text-gray-500" />
                    </div>
                  </Link>
                )}
                {(pending?.expiringInsurance || 0) > 0 && (
                  <Link href="/admin/companies">
                    <div className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800 hover:shadow-sm">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-sm">{pending?.expiringInsurance} Expiring Insurance</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Within 30 days</p>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto text-gray-400 dark:text-gray-500" />
                    </div>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Today's Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {"Today's Routes"}
              </CardTitle>
              <Link href="/admin/schedules">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!data?.todaySchedules?.length ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">No scheduled routes</p>
              ) : (
                <div className="space-y-3">
                  {data.todaySchedules.map((sched: any) => (
                    <Link key={sched.id} href={`/admin/schedules/${sched.id}`}>
                      <div className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{sched.routeName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {sched.departureTime} {" \u00B7 "} {sched.driver?.user?.name || "No driver"} {" \u00B7 "}
                            {sched._count?.seatAssignments || 0}/{sched.vehicle?.seats || 0} seats
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[sched.status] || "bg-gray-100"}`}>
                          {sched.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {!data?.recentActivity?.length ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">No recent activity</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.slice(0, 8).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        log.action === "CREATE" ? "bg-green-100" :
                        log.action === "DELETE" ? "bg-red-100" : "bg-blue-100"
                      }`}>
                        {log.action === "CREATE" ? <CheckCircle className="h-3.5 w-3.5 text-green-600" /> :
                         log.action === "DELETE" ? <XCircle className="h-3.5 w-3.5 text-red-600" /> :
                         <CheckCircle className="h-3.5 w-3.5 text-blue-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user?.name || "System"}</span>
                          {" "}{log.action.toLowerCase()}d {log.entity.toLowerCase()}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {new Date(log.timestamp).toLocaleString("en-GB")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Expiring Licences */}
        {(data?.expiringLicences?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                <AlertTriangle className="h-5 w-5" />
                Expiring Driver Licences (within 60 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.expiringLicences.map((d: any) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-100 dark:border-orange-800">
                    <div>
                      <p className="font-medium text-sm">{d.user?.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Licence: {d.licenceNumber} {"\u2022"} Class: {d.licenceClass}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">{formatDate(d.licenceExpiry)}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
