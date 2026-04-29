"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, CheckCircle, XCircle, Loader2 } from "lucide-react"
import toast from "react-hot-toast"

export default function AttendancePage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [attendance, setAttendance] = useState<Record<string, 'BOARDED' | 'ABSENT'>>({})
  const [submitting, setSubmitting] = useState(false)
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/driver/schedule")
      .then(r => r.json())
      .then(d => setSchedules(Array.isArray(d?.schedules) ? d.schedules : []))
  }, [])

  const loadSchedule = (id: string) => {
    setLoadingSchedule(true)
    fetch(`/api/driver/attendance?scheduleId=${id}`)
      .then(r => r.json())
      .then(d => {
        setSelectedSchedule(d.schedule)
        const initial: Record<string, 'BOARDED' | 'ABSENT'> = {}
        d.schedule?.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED').forEach((a: any) => {
          initial[a.pupilId] = d.attendance?.[a.pupilId] === 'ABSENT' ? 'ABSENT' : 'BOARDED'
        })
        setAttendance(initial)
        setSavedAt(d.savedAt || null)
      })
      .finally(() => setLoadingSchedule(false))
  }

  const toggleAttendance = (pupilId: string) => {
    setAttendance(prev => ({
      ...prev,
      [pupilId]: prev[pupilId] === 'BOARDED' ? 'ABSENT' : 'BOARDED',
    }))
  }

  const submitAttendance = () => {
    setSubmitting(true)
    fetch("/api/driver/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scheduleId: selectedSchedule?.id,
        attendance,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || "Failed to save attendance")
        }
        return res.json()
      })
      .then((data) => {
        setSavedAt(data.savedAt || new Date().toISOString())
        toast.success(`Attendance confirmed: ${Object.values(attendance).filter(v => v === 'BOARDED').length} boarded, ${Object.values(attendance).filter(v => v === 'ABSENT').length} absent`)
      })
      .catch((error) => toast.error(error.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <DashboardLayout title="Attendance Register">
      <div className="space-y-6">
        <div>
          <Select onValueChange={loadSchedule}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Select route..." /></SelectTrigger>
            <SelectContent>
              {schedules.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.routeName} ({s.departureTime})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {!selectedSchedule ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">Select a route to take attendance</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance for {selectedSchedule.routeName}</CardTitle>
                <div className="flex flex-col items-end gap-1 text-sm">
                  <div className="flex gap-2 text-sm">
                    <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" />{Object.values(attendance).filter(v => v === 'BOARDED').length} Boarded</span>
                    <span className="flex items-center gap-1 text-red-600"><XCircle className="h-4 w-4" />{Object.values(attendance).filter(v => v === 'ABSENT').length} Absent</span>
                  </div>
                  {savedAt && <span className="text-xs text-gray-500 dark:text-gray-400">Saved {new Date(savedAt).toLocaleString("en-GB")}</span>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {loadingSchedule && (
                <div className="flex items-center justify-center h-16">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              )}
              {selectedSchedule.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED').map((a: any) => (
                <div
                  key={a.id}
                  onClick={() => toggleAttendance(a.pupilId)}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    attendance[a.pupilId] === 'BOARDED'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div>
                    <p className="font-semibold">{a.pupil?.fullName}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Seat {a.seatNumber} · {a.pupil?.yearLevel}</p>
                  </div>
                  <Badge variant={attendance[a.pupilId] === 'BOARDED' ? 'success' : 'destructive'}>
                    {attendance[a.pupilId] === 'BOARDED' ? (
                      <span className="flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Boarded</span>
                    ) : (
                      <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />Absent</span>
                    )}
                  </Badge>
                </div>
              ))}

              <Button className="w-full mt-4" onClick={submitAttendance} disabled={submitting || loadingSchedule || !selectedSchedule?.id}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Attendance & Start Route"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
