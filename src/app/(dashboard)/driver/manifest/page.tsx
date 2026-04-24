"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BookOpen, Loader2, AlertTriangle, Phone, GraduationCap, Printer } from "lucide-react"

export default function ManifestPage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/schedules")
      .then(r => r.json())
      .then(d => { setSchedules(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loadManifest = (id: string) => {
    fetch(`/api/admin/schedules/${id}`)
      .then(r => r.json())
      .then(d => setSelectedSchedule(d))
  }

  return (
    <DashboardLayout title="Passenger Manifest">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Select onValueChange={loadManifest}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select route..." /></SelectTrigger>
            <SelectContent>
              {schedules.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.routeName} ({s.departureTime})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedSchedule && (
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />Print Manifest
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !selectedSchedule ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">Select a route to view manifest</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-2 border-black">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">{selectedSchedule.routeName}</CardTitle>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">{selectedSchedule.direction === 'HOME_TO_SCHOOL' ? 'Home → School' : 'School → Home'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{selectedSchedule.departureTime}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Departure</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
                  <div><p className="text-gray-500 dark:text-gray-400">Vehicle</p><p className="font-mono font-medium">{selectedSchedule.vehicle?.regPlate || 'TBA'}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400">Driver</p><p className="font-medium">{selectedSchedule.driver?.user?.name || 'N/A'}</p></div>
                  <div><p className="text-gray-500 dark:text-gray-400">School</p><p className="font-medium">{selectedSchedule.school?.name || 'N/A'}</p></div>
                </div>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader><CardTitle>Passenger List ({selectedSchedule.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED').length || 0} pupils)</CardTitle></CardHeader>
              <CardContent>
                {selectedSchedule.seatAssignments?.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">No pupils assigned</p>
                ) : (
                  <div className="space-y-3">
                    {selectedSchedule.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED').map((a: any, i: number) => (
                      <div key={a.id} className="flex items-center gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                        <span className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {a.seatNumber || i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{a.pupil?.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{a.pupil?.yearLevel} · {a.pupil?.school?.name}</p>
                          {a.pupil?.pickupLocation && <p className="text-xs text-gray-400 dark:text-gray-500">📍 {a.pupil.pickupLocation}</p>}
                        </div>
                        <div className="text-right">
                          {a.pupil?.specialRequirements && (
                            <div className="flex items-center gap-1 text-orange-600 text-xs mb-1">
                              <AlertTriangle className="h-3 w-3" />
                              {a.pupil.specialRequirements}
                            </div>
                          )}
                          {a.pupil?.parent?.user?.phone && (
                            <div className="flex items-center gap-1 text-gray-500 text-xs">
                              <Phone className="h-3 w-3" />
                              {a.pupil.parent.user.phone}
                            </div>
                          )}
                          {a.pupil?.emergencyContactPhone && (
                            <div className="flex items-center gap-1 text-red-600 text-xs">
                              <Phone className="h-3 w-3" />
                              Emergency: {a.pupil.emergencyContactPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
