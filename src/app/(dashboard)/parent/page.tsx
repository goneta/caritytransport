"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { GraduationCap, Route, Bus, Bell, Clock, User, AlertTriangle, MessageSquare, ChevronRight } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils"
import UserQRCard from "@/components/shared/user-qr-card"

export default function ParentDashboard() {
  const { data: session } = useSession()
  const [pupils, setPupils] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    Promise.all([
      fetch(`/api/parent/pupils?parentUserId=${session.user.id}`).then(r => r.json()),
      fetch(`/api/parent/notifications?userId=${session.user.id}`).then(r => r.json()),
    ]).then(([p, n]) => {
      setPupils(Array.isArray(p) ? p : [])
      setNotifications(Array.isArray(n) ? n : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [session?.user?.id])

  const unreadCount = notifications.filter(n => !n.read).length
  const activeAssignments = pupils.flatMap(p => (p.seatAssignments || []).filter((a: any) => a.status === 'ASSIGNED').map((a: any) => ({ ...a, pupilName: p.fullName })))
  const pendingRouteChanges = pupils.flatMap(p => (p.routeChangeRequests || []).filter((r: any) => r.status === 'PENDING').map((r: any) => ({ ...r, pupilName: p.fullName })))

  return (
    <DashboardLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="bg-black text-white rounded-xl p-6">
          <p className="text-gray-400 dark:text-gray-500 text-sm">Welcome back,</p>
          <h2 className="text-2xl font-bold mt-1">{session?.user?.name}</h2>
          <p className="text-gray-300 mt-2 text-sm">
            {pupils.length > 0
              ? `Managing transport for ${pupils.length} child${pupils.length !== 1 ? 'ren' : ''}`
              : 'No children registered yet — add your child to get started'}
          </p>
        </div>

        {/* QR Code + Quick Stats */}
        <div className="grid lg:grid-cols-4 gap-4">
          <div className="lg:col-span-1">
            <UserQRCard userId={session?.user?.id || ""} userName={session?.user?.name || ""} />
          </div>
          <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-2 gap-4 content-start">
          {[
            { label: "Children", value: pupils.length, icon: GraduationCap, href: "/parent/children" },
            { label: "Active Routes", value: pupils.reduce((sum, p) => sum + (p.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED').length || 0), 0), icon: Route, href: "/parent/schedules" },
            { label: "Unread Alerts", value: unreadCount, icon: Bell, href: "/parent/notifications" },
            { label: "Upcoming Absences", value: pupils.reduce((sum, p) => sum + (p.absences?.length || 0), 0), icon: AlertTriangle, href: "/parent/children" },
          ].map((s, i) => (
            <Link key={i} href={s.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                    <p className="text-2xl font-bold">{s.value}</p>
                  </div>
                  <s.icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </CardContent>
              </Card>
            </Link>
          ))}
          </div>
        </div>


        {pupils.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Family Transport Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Children covered</p>
                  <p className="text-2xl font-bold">{pupils.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Assigned route seats</p>
                  <p className="text-2xl font-bold">{activeAssignments.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <p className="text-xs text-gray-500">Pending route changes</p>
                  <p className="text-2xl font-bold">{pendingRouteChanges.length}</p>
                </div>
              </div>
              <div className="space-y-2">
                {activeAssignments.slice(0, 6).map((assignment: any) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span className="font-medium">{assignment.pupilName}</span>
                    <span className="text-gray-500">{assignment.schedule?.routeName || 'Route'} · {assignment.schedule?.departureTime || 'Time TBA'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Children Overview */}
        {pupils.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Your Children</h3>
              <Link href="/parent/children"><Button variant="ghost" size="sm">Manage <ChevronRight className="h-4 w-4" /></Button></Link>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {pupils.map(pupil => {
                const assignment = pupil.seatAssignments?.[0]
                const sched = assignment?.schedule
                return (
                  <Card key={pupil.id}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-5 w-5 text-gray-600 dark:text-gray-400 dark:text-gray-500" />
                          </div>
                          <div>
                            <p className="font-semibold">{pupil.fullName}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{pupil.yearLevel} · {pupil.school?.name}</p>
                          </div>
                        </div>
                        <Badge variant={pupil.activeTransport ? "success" : "secondary"}>
                          {pupil.activeTransport ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {sched ? (
                        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Today's Transport</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            <span>Pickup: <strong>{sched.departureTime}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <User className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            <span>Driver: <strong>{sched.driver?.user?.name || 'TBA'}</strong></span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Bus className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                            <span>Vehicle: <strong>{sched.vehicle?.regPlate || 'TBA'}</strong></span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-100 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">No transport route assigned yet. Contact your school admin.</p>
                        </div>
                      )}

                      {pupil.specialRequirements && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-orange-600">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{pupil.specialRequirements}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {pupils.length === 0 && !loading && (
          <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="p-10 text-center">
              <GraduationCap className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="font-semibold text-gray-600 dark:text-gray-400">No children registered</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 mb-4">Add your child to manage their school transport</p>
              <Link href="/parent/children">
                <Button>Add Child</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Notifications */}
        {notifications.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Recent Notifications
                {unreadCount > 0 && <Badge variant="destructive" className="ml-1">{unreadCount}</Badge>}
              </CardTitle>
              <Link href="/parent/notifications"><Button variant="ghost" size="sm">View all</Button></Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notifications.slice(0, 5).map(n => (
                  <div key={n.id} className={`p-3 rounded-lg border ${!n.read ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'border-transparent'}`}>
                    {n.subject && <p className="font-medium text-sm">{n.subject}</p>}
                    <p className="text-sm text-gray-600 dark:text-gray-400">{n.message}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(n.sentAt).toLocaleString('en-GB')}</p>
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
