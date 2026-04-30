"use client"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeft, Users, Bus, MapPin, Clock, Plus, Trash2, Loader2, AlertTriangle, Sparkles, CheckCircle } from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

export default function ScheduleDetailPage() {
  const { id } = useParams()
  const [schedule, setSchedule] = useState<any>(null)
  const [allPupils, setAllPupils] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAssign, setShowAssign] = useState(false)
  const [selectedPupilId, setSelectedPupilId] = useState("")
  const [assigning, setAssigning] = useState(false)
  const [statusChange, setStatusChange] = useState("")
  const [optimizing, setOptimizing] = useState(false)
  const [applyingOptimization, setApplyingOptimization] = useState(false)
  const [optimizationSuggestion, setOptimizationSuggestion] = useState<any>(null)

  const fetchSchedule = () => {
    fetch(`/api/admin/schedules/${id}`)
      .then(r => r.json())
      .then(d => { setSchedule(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchSchedule()
    fetch("/api/admin/pupils").then(r => r.json()).then(d => setAllPupils(Array.isArray(d) ? d : []))
  }, [id])

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPupilId) return
    setAssigning(true)
    const res = await fetch(`/api/admin/schedules/${id}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pupilId: selectedPupilId }),
    })
    setAssigning(false)
    if (res.ok) {
      const d = await res.json()
      toast.success(d.waitlisted ? "Pupil added to waitlist (vehicle full)" : "Pupil assigned successfully")
      setShowAssign(false)
      setSelectedPupilId("")
      fetchSchedule()
    } else {
      const d = await res.json()
      toast.error(d.error || "Failed to assign pupil")
    }
  }

  const handleRemovePupil = async (pupilId: string) => {
    if (!confirm("Remove this pupil from the route?")) return
    const res = await fetch(`/api/admin/schedules/${id}/assign`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pupilId }),
    })
    if (res.ok) { toast.success("Pupil removed"); fetchSchedule() }
    else toast.error("Failed to remove pupil")
  }

  const handleStatusChange = async (status: string) => {
    const res = await fetch(`/api/admin/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...schedule, status }),
    })
    if (res.ok) { toast.success("Status updated"); fetchSchedule() }
    else toast.error("Failed to update status")
  }

  const handleOptimizeRoute = async (apply = false) => {
    if (apply) setApplyingOptimization(true)
    else setOptimizing(true)

    const res = await fetch(`/api/admin/schedules/${id}/optimize`, {
      method: apply ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: apply ? JSON.stringify({ apply: true }) : undefined,
    })
    const data = await res.json().catch(() => ({}))

    setOptimizing(false)
    setApplyingOptimization(false)

    if (!res.ok) {
      toast.error(data.error || "Failed to optimize route")
      if (data.suggestion) setOptimizationSuggestion(data.suggestion)
      return
    }

    setOptimizationSuggestion(data.suggestion)
    toast.success(apply ? "Optimized pickup stops saved" : "Route suggestion generated")
    if (apply) fetchSchedule()
  }

  if (loading) return (
    <DashboardLayout title="Route Detail">
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </DashboardLayout>
  )

  if (!schedule) return (
    <DashboardLayout title="Route Detail">
      <p className="text-gray-500 dark:text-gray-400">Route not found</p>
    </DashboardLayout>
  )

  const assigned = schedule.seatAssignments?.filter((a: any) => a.status === 'ASSIGNED') || []
  const waitlisted = schedule.seatAssignments?.filter((a: any) => a.status === 'WAITLISTED') || []
  const capacity = schedule.vehicle?.seats || 0
  const utilPct = capacity > 0 ? Math.round((assigned.length / capacity) * 100) : 0

  const statusColor: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-700 dark:text-gray-300",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const unassignedPupils = allPupils.filter(p =>
    !schedule.seatAssignments?.some((a: any) => a.pupilId === p.id && a.status !== 'CANCELLED')
  )

  const stops = (() => { try { return JSON.parse(schedule.pickupStops || '[]') } catch { return [] } })()

  return (
    <DashboardLayout title="Route Detail">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/schedules">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Back</Button>
          </Link>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{schedule.routeName}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{schedule.direction === 'HOME_TO_SCHOOL' ? 'Home → School' : 'School → Home'} · {schedule.recurrence}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleOptimizeRoute(false)} disabled={optimizing || applyingOptimization}>
              {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Optimize pickups
            </Button>
            <span className={`text-sm px-3 py-1 rounded-full font-medium ${statusColor[schedule.status]}`}>{schedule.status}</span>
            <Select value={schedule.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SCHEDULED">SCHEDULED</SelectItem>
                <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                <SelectItem value="CANCELLED">CANCELLED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Route Info */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Route Info</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Departure</span><span className="font-medium">{schedule.departureTime}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">School</span><span className="font-medium">{schedule.school?.name || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Drop-off</span><span className="font-medium text-right max-w-32 truncate">{schedule.dropoffLocation || 'N/A'}</span></div>
            </CardContent>
          </Card>

          {/* Vehicle */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Bus className="h-4 w-4" />Vehicle</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {schedule.vehicle ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Registration</span><span className="font-mono font-medium">{schedule.vehicle.regPlate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Model</span><span>{schedule.vehicle.model || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Seats</span><span>{schedule.vehicle.seats}</span></div>
                </>
              ) : <p className="text-gray-500 dark:text-gray-400">No vehicle assigned</p>}
            </CardContent>
          </Card>

          {/* Driver */}
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Driver</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {schedule.driver ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Name</span><span className="font-medium">{schedule.driver.user?.name}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Phone</span><span>{schedule.driver.user?.phone || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Licence</span><span>{schedule.driver.licenceClass}</span></div>
                </>
              ) : <p className="text-gray-500 dark:text-gray-400">No driver assigned</p>}
            </CardContent>
          </Card>
        </div>

        {/* Capacity Bar */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold">Seat Capacity</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{assigned.length} assigned · {waitlisted.length} waitlisted · {capacity} total seats</p>
              </div>
              <span className={`text-2xl font-bold ${utilPct >= 100 ? 'text-red-600' : utilPct > 75 ? 'text-orange-600' : 'text-green-600'}`}>
                {utilPct}%
              </span>
            </div>
            <div className="w-full h-3 bg-gray-100 dark:bg-gray-800 rounded-full">
              <div className={`h-full rounded-full transition-all ${utilPct >= 100 ? 'bg-red-500' : utilPct > 75 ? 'bg-orange-400' : 'bg-green-500'}`}
                style={{ width: `${Math.min(utilPct, 100)}%` }} />
            </div>
            {assigned.length >= capacity && capacity > 0 && (
              <p className="text-red-600 text-sm mt-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> Vehicle is at full capacity — new pupils will be waitlisted
              </p>
            )}
          </CardContent>
        </Card>

        {/* Route Optimization Assistant */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" />Route Optimization Assistant</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleOptimizeRoute(false)} disabled={optimizing || applyingOptimization || assigned.length === 0}>
                {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Suggest order
              </Button>
              <Button size="sm" onClick={() => handleOptimizeRoute(true)} disabled={applyingOptimization || optimizing || !optimizationSuggestion?.stops?.length}>
                {applyingOptimization ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Apply stops
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Suggests a pickup order for assigned pupils using their pickup addresses and postcodes. Suggestions are not saved until an admin applies them.
            </p>
            {optimizationSuggestion?.warnings?.length > 0 && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                {optimizationSuggestion.warnings.map((warning: string, index: number) => <p key={index}>{warning}</p>)}
              </div>
            )}
            {optimizationSuggestion?.stops?.length > 0 ? (
              <div className="space-y-2">
                {optimizationSuggestion.stops.map((stop: any, i: number) => (
                  <div key={stop.pupilId || i} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{stop.pupilName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{stop.address}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stop.estimatedTime} · {stop.confidence} confidence</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {assigned.length === 0 ? "Assign pupils to this route before generating a pickup-order suggestion." : "Generate a suggestion to preview the proposed pickup order."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Pickup Stops */}
        {stops.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin className="h-4 w-4" />Saved Pickup Stops</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stops.map((stop: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</div>
                    <div>
                      <p className="text-sm font-medium">{stop.pupilName ? `${stop.pupilName} — ` : ""}{stop.address}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stop.estimatedTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seat Assignments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />Assigned Pupils ({assigned.length})</CardTitle>
            <Button size="sm" onClick={() => setShowAssign(true)}><Plus className="h-4 w-4" />Assign Pupil</Button>
          </CardHeader>
          <CardContent>
            {assigned.length === 0 && waitlisted.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-6">No pupils assigned to this route</p>
            ) : (
              <div className="space-y-4">
                {assigned.length > 0 && (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Seat</TableHead>
                        <TableHead>Pupil</TableHead>
                        <TableHead>School</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Special Requirements</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assigned.map((a: any) => (
                        <TableRow key={a.id}>
                          <TableCell className="font-mono font-medium">{a.seatNumber || '-'}</TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{a.pupil?.fullName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{a.pupil?.yearLevel}</p>
                          </TableCell>
                          <TableCell className="text-sm">{a.pupil?.school?.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm">{a.pupil?.parent?.user?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {a.pupil?.specialRequirements && (
                              <span className="flex items-center gap-1 text-xs text-orange-600">
                                <AlertTriangle className="h-3 w-3" />{a.pupil.specialRequirements}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleRemovePupil(a.pupilId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {waitlisted.length > 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-semibold text-yellow-800 mb-2">Waitlisted ({waitlisted.length})</p>
                    <div className="space-y-1">
                      {waitlisted.map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between text-sm">
                          <span>{a.pupil?.fullName} ({a.pupil?.yearLevel})</span>
                          <Button variant="ghost" size="icon" className="text-red-600 h-6 w-6" onClick={() => handleRemovePupil(a.pupilId)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assign Pupil Dialog */}
      <Dialog open={showAssign} onOpenChange={setShowAssign}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Pupil to Route</DialogTitle></DialogHeader>
          <form onSubmit={handleAssign} className="space-y-4">
            <div className="space-y-2">
              <Label>Select Pupil</Label>
              <Select value={selectedPupilId} onValueChange={setSelectedPupilId}>
                <SelectTrigger><SelectValue placeholder="Choose a pupil..." /></SelectTrigger>
                <SelectContent>
                  {unassignedPupils.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.fullName} — {p.yearLevel} ({p.school?.name || 'No school'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {assigned.length >= capacity && capacity > 0 && (
              <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Vehicle is full — pupil will be added to waitlist
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAssign(false)}>Cancel</Button>
              <Button type="submit" disabled={assigning || !selectedPupilId}>
                {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Pupil"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
