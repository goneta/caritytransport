"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Route, Clock, Bus, User, School, MapPin, Loader2 } from "lucide-react"

export default function ParentSchedulesPage() {
  const { data: session } = useSession()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return
    fetch(`/api/parent/schedules?parentUserId=${session.user.id}`)
      .then(r => r.json())
      .then(d => { setAssignments(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [session?.user?.id])

  const grouped: Record<string, any[]> = {}
  assignments.forEach(a => {
    const key = a.pupil?.fullName || 'Unknown'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(a)
  })

  const directionLabel: Record<string, string> = {
    HOME_TO_SCHOOL: 'Home → School',
    SCHOOL_TO_HOME: 'School → Home',
  }

  const statusColor: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    COMPLETED: "bg-gray-100 text-gray-700 dark:text-gray-300",
  }

  const stops = (sched: any) => {
    try { return JSON.parse(sched.pickupStops || '[]') } catch { return [] }
  }

  return (
    <DashboardLayout title="Transport Schedule">
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">View your children's transport routes and pickup details.</p>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : Object.keys(grouped).length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Route className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">No routes assigned</p>
              <p className="text-sm text-gray-400 mt-1">Your children haven't been assigned to transport routes yet. Contact your school administrator.</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(grouped).map(([childName, childAssignments]) => (
            <div key={childName} className="space-y-3">
              <h3 className="font-semibold text-lg">{childName}</h3>
              {childAssignments.map(a => (
                <Card key={a.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{a.schedule?.routeName}</CardTitle>
                        <p className="text-sm text-gray-500 mt-0.5">{directionLabel[a.schedule?.direction] || a.schedule?.direction}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={a.status === 'ASSIGNED' ? 'success' : 'warning'}>{a.status}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[a.schedule?.status] || 'bg-gray-100'}`}>
                          {a.schedule?.status}
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Departure</p>
                          <p className="font-semibold">{a.schedule?.departureTime}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Driver</p>
                          <p className="font-semibold">{a.schedule?.driver?.user?.name || 'TBA'}</p>
                          {a.schedule?.driver?.user?.phone && <p className="text-xs text-gray-500 dark:text-gray-400">{a.schedule.driver.user.phone}</p>}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Bus className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Vehicle</p>
                          <p className="font-semibold font-mono">{a.schedule?.vehicle?.regPlate || 'TBA'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{a.schedule?.vehicle?.model}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <School className="h-4 w-4 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">School</p>
                          <p className="font-semibold text-sm">{a.schedule?.school?.name || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {stops(a.schedule).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pickup Stops</p>
                        <div className="space-y-1">
                          {stops(a.schedule).map((stop: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="w-5 h-5 bg-black text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</span>
                              <MapPin className="h-3 w-3 text-gray-400 dark:text-gray-500" />
                              <span className="text-gray-700 dark:text-gray-300">{stop.address}</span>
                              <span className="text-gray-400 dark:text-gray-500 ml-auto">{stop.estimatedTime}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {a.schedule?.dropoffLocation && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span>Drop-off: {a.schedule.dropoffLocation}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
