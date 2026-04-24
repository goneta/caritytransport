"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Bus, Clock, CheckCircle, Loader2, Route } from "lucide-react"

export default function TrackingPage() {
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

  const tripStatuses = [
    { id: 1, label: "Route scheduled", icon: Route, active: true, time: "07:30" },
    { id: 2, label: "Vehicle departed depot", icon: Bus, active: true, time: "07:32" },
    { id: 3, label: "En route to pickup", icon: MapPin, active: false, time: "" },
    { id: 4, label: "Arrived at pickup point", icon: MapPin, active: false, time: "" },
    { id: 5, label: "Pupil boarded", icon: CheckCircle, active: false, time: "" },
    { id: 6, label: "En route to school", icon: Bus, active: false, time: "" },
    { id: 7, label: "Pupil dropped at school", icon: CheckCircle, active: false, time: "" },
  ]

  return (
    <DashboardLayout title="Live Tracking">
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400 text-sm">Track your child's transport in real-time.</p>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">No active routes</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">No transport routes assigned to your children yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Live Map Placeholder */}
            <Card className="overflow-hidden">
              <div className="relative bg-gray-100 h-64 flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center animate-pulse">
                    <Bus className="h-8 w-8 text-white" />
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full">
                    <p className="text-sm font-medium">Live GPS Tracking</p>
                    <p className="text-xs text-gray-500 text-center">Map requires Google Maps API key configuration</p>
                  </div>
                </div>
                {/* Mock map grid */}
                <div className="absolute inset-0 opacity-10">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="absolute border-gray-400 border" style={{ left: `${i * 10}%`, top: 0, bottom: 0, width: 1 }} />
                  ))}
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="absolute border-gray-400 border" style={{ top: `${i * 12.5}%`, left: 0, right: 0, height: 1 }} />
                  ))}
                </div>
              </div>
            </Card>

            {/* Trip Status for each child */}
            {assignments.map(a => (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{a.pupil?.fullName} — {a.schedule?.routeName}</span>
                    <Badge variant="success">SCHEDULED</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Bus className="h-5 w-5" />
                    <div>
                      <p className="font-medium text-sm">Vehicle: {a.schedule?.vehicle?.regPlate || 'TBA'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Driver: {a.schedule?.driver?.user?.name || 'TBA'}</p>
                    </div>
                    <div className="ml-auto">
                      <p className="font-semibold">{a.schedule?.departureTime}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Departure</p>
                    </div>
                  </div>

                  {/* Trip Timeline */}
                  <div className="space-y-0">
                    {tripStatuses.map((step, i) => (
                      <div key={step.id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${step.active ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <step.icon className="h-4 w-4" />
                          </div>
                          {i < tripStatuses.length - 1 && (
                            <div className={`w-0.5 h-8 ${step.active && tripStatuses[i + 1]?.active ? 'bg-black' : 'bg-gray-200'}`} />
                          )}
                        </div>
                        <div className="pb-4 pt-1 flex items-center justify-between w-full">
                          <p className={`text-sm ${step.active ? 'font-medium text-black' : 'text-gray-400'}`}>{step.label}</p>
                          {step.time && <span className="text-xs text-gray-500 dark:text-gray-400">{step.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-700">
                      🔔 You will receive real-time SMS and email notifications as the vehicle progresses through each stage.
                      Live GPS tracking requires the driver to be using the Carity Driver app.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
