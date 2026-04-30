"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GraduationCap, Plus, Loader2, AlertTriangle, Route, Bus, User, CalendarOff, Clock, ShieldCheck } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate } from "@/lib/utils"

export default function ChildrenPage() {
  const { data: session } = useSession()
  const [pupils, setPupils] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [showAbsence, setShowAbsence] = useState(false)
  const [showRouteChange, setShowRouteChange] = useState(false)
  const [showGuardian, setShowGuardian] = useState(false)
  const [selectedPupil, setSelectedPupil] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fullName: "", dateOfBirth: "", yearLevel: "", studentNumber: "", schoolId: "", pickupLocation: "", specialRequirements: "", emergencyContactName: "", emergencyContactPhone: "" })
  const [absenceForm, setAbsenceForm] = useState({ date: "", reason: "" })
  const [routeOptions, setRouteOptions] = useState<any[]>([])
  const [routeChangeForm, setRouteChangeForm] = useState({ currentScheduleId: "", requestedScheduleId: "", startDate: "", endDate: "", reason: "" })
  const [guardianForm, setGuardianForm] = useState({ name: "", relationship: "", phone: "", email: "", validUntil: "" })
  const [lastGuardianCredentials, setLastGuardianCredentials] = useState<any>(null)

  const fetchPupils = () => {
    if (!session?.user?.id) return
    setLoading(true)
    Promise.all([
      fetch(`/api/parent/pupils?parentUserId=${session.user.id}`).then(r => r.json()),
      fetch("/api/admin/schools").then(r => r.json()),
      fetch("/api/parent/search").then(r => r.json()).catch(() => []),
    ]).then(([p, s, routes]) => {
      setPupils(Array.isArray(p) ? p : [])
      setSchools(Array.isArray(s) ? s : [])
      setRouteOptions(Array.isArray(routes) ? routes : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchPupils() }, [session?.user?.id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/parent/pupils", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, parentUserId: session?.user?.id }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Child added successfully"); setShowAdd(false); fetchPupils() }
    else { const d = await res.json(); toast.error(d.error || "Failed to add child") }
  }

  const handleReportAbsence = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPupil) return
    setSaving(true)
    const res = await fetch("/api/parent/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pupilId: selectedPupil.id, ...absenceForm }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Absence reported — driver and admin have been notified")
      setShowAbsence(false)
      fetchPupils()
    } else toast.error("Failed to report absence")
  }

  const openRouteChange = (pupil: any) => {
    const current = pupil.seatAssignments?.[0]?.schedule?.id || ""
    setSelectedPupil(pupil)
    setRouteChangeForm({ currentScheduleId: current, requestedScheduleId: "", startDate: "", endDate: "", reason: "" })
    setShowRouteChange(true)
  }

  const handleRouteChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPupil) return
    setSaving(true)
    const res = await fetch("/api/parent/route-changes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pupilId: selectedPupil.id, ...routeChangeForm }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Route-change request submitted for admin review")
      setShowRouteChange(false)
      fetchPupils()
    } else {
      const d = await res.json().catch(() => ({}))
      toast.error(d.error || "Failed to submit route-change request")
    }
  }

  const openGuardianDialog = (pupil: any) => {
    setSelectedPupil(pupil)
    setGuardianForm({ name: "", relationship: "", phone: "", email: "", validUntil: "" })
    setLastGuardianCredentials(null)
    setShowGuardian(true)
  }

  const handleGuardianSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPupil) return
    setSaving(true)
    const res = await fetch("/api/parent/guardians", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pupilId: selectedPupil.id, ...guardianForm }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok) {
      setLastGuardianCredentials(data)
      toast.success("Authorized guardian added")
      fetchPupils()
    } else {
      toast.error(data.error || "Failed to add authorized guardian")
    }
  }

  const revokeGuardian = async (guardianId: string) => {
    if (!confirm("Revoke this guardian's pickup authorization?")) return
    const res = await fetch("/api/parent/guardians", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: guardianId, status: "REVOKED" }),
    })
    if (res.ok) {
      toast.success("Guardian authorization revoked")
      fetchPupils()
    } else {
      toast.error("Failed to revoke guardian")
    }
  }

  return (
    <DashboardLayout title="My Children">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your children's transport details and report absences.</p>
          <Button onClick={() => { setForm({ fullName: "", dateOfBirth: "", yearLevel: "", studentNumber: "", schoolId: "", pickupLocation: "", specialRequirements: "", emergencyContactName: "", emergencyContactPhone: "" }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Add Child
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : pupils.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
            <CardContent className="p-12 text-center">
              <GraduationCap className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">No children registered</p>
              <p className="text-sm text-gray-400 mt-1 mb-4">Add your child's details to enrol them in school transport</p>
              <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4" />Add Child</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {pupils.map(pupil => {
              const assignments = pupil.seatAssignments || []
              const upcomingAbsences = pupil.absences || []
              const pendingRouteChanges = pupil.routeChangeRequests || []
              return (
                <Card key={pupil.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                          <GraduationCap className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div>
                          <CardTitle>{pupil.fullName}</CardTitle>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{pupil.yearLevel || 'Year N/A'} · {pupil.school?.name || 'No school'}</p>
                          {pupil.studentNumber && <p className="text-xs text-gray-400 dark:text-gray-500">ID: {pupil.studentNumber}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => { setSelectedPupil(pupil); setAbsenceForm({ date: "", reason: "" }); setShowAbsence(true) }}
                          className="text-xs"
                        >
                          <CalendarOff className="h-3.5 w-3.5" />Report Absence
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRouteChange(pupil)}
                          className="text-xs"
                        >
                          <Route className="h-3.5 w-3.5" />Route Change
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openGuardianDialog(pupil)}
                          className="text-xs"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />Guardians
                        </Button>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 space-y-4">
                    {/* Special requirements */}
                    {pupil.specialRequirements && (
                      <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                        <p className="text-sm text-orange-700">{pupil.specialRequirements}</p>
                      </div>
                    )}

                    {/* Assigned Routes */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Transport Routes</p>
                      {assignments.length === 0 ? (
                        <p className="text-sm text-gray-500 italic">No transport route assigned</p>
                      ) : (
                        <div className="space-y-2">
                          {assignments.map((a: any) => (
                            <div key={a.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-3">
                              <Badge variant={a.status === 'ASSIGNED' ? "success" : "warning"}>{a.status}</Badge>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm">{a.schedule?.routeName}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.schedule?.departureTime}</span>
                                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{a.schedule?.driver?.user?.name || 'TBA'}</span>
                                  <span className="flex items-center gap-1"><Bus className="h-3 w-3" />{a.schedule?.vehicle?.regPlate || 'TBA'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Upcoming absences */}
                    {upcomingAbsences.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming Absences</p>
                        <div className="space-y-1">
                          {upcomingAbsences.map((ab: any) => (
                            <div key={ab.id} className="flex items-center gap-2 text-sm p-2 bg-yellow-50 border border-yellow-100 rounded">
                              <CalendarOff className="h-3.5 w-3.5 text-yellow-600" />
                              <span>{formatDate(ab.date)}</span>
                              {ab.reason && <span className="text-gray-500 dark:text-gray-400">— {ab.reason}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingRouteChanges.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Temporary Route Changes</p>
                        <div className="space-y-1">
                          {pendingRouteChanges.map((req: any) => (
                            <div key={req.id} className="flex items-center gap-2 text-sm p-2 bg-blue-50 border border-blue-100 rounded">
                              <Route className="h-3.5 w-3.5 text-blue-600" />
                              <span>{formatDate(req.startDate)}</span>
                              <span className="text-gray-500">to {req.requestedSchedule?.routeName || 'requested route'}</span>
                              <Badge variant={req.status === 'APPROVED' ? 'success' : 'secondary'}>{req.status}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Authorized Pickup Guardians</p>
                      {pupil.authorizedGuardians?.length ? (
                        <div className="space-y-2">
                          {pupil.authorizedGuardians.map((guardian: any) => (
                            <div key={guardian.id} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-2 text-sm dark:border-gray-700">
                              <div>
                                <p className="font-medium">{guardian.name} <span className="text-gray-500">({guardian.relationship})</span></p>
                                <p className="text-xs text-gray-500">{guardian.phone || guardian.email || 'No contact added'} · {guardian.status}</p>
                              </div>
                              {guardian.status === 'ACTIVE' && (
                                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => revokeGuardian(guardian.id)}>Revoke</Button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">No additional pickup guardians authorized.</p>
                      )}
                    </div>

                    {/* Emergency Contact */}
                    {pupil.emergencyContactName && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Emergency Contact</p>
                        <p className="text-sm">{pupil.emergencyContactName} · {pupil.emergencyContactPhone}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Child Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Child</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Year / Level</Label><Input value={form.yearLevel} onChange={e => setForm(p => ({ ...p, yearLevel: e.target.value }))} placeholder="e.g. Year 3" /></div>
              <div className="space-y-1"><Label>Student Number</Label><Input value={form.studentNumber} onChange={e => setForm(p => ({ ...p, studentNumber: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>School</Label>
                <Select value={form.schoolId} onValueChange={v => setForm(p => ({ ...p, schoolId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>{schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2"><Label>Pickup Location</Label><Input value={form.pickupLocation} onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))} placeholder="Leave blank to use your home address" /></div>
              <div className="space-y-1 col-span-2"><Label>Special Requirements</Label><Input value={form.specialRequirements} onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))} placeholder="e.g. Wheelchair, nut allergy" /></div>
              <div className="space-y-1"><Label>Emergency Contact Name</Label><Input value={form.emergencyContactName} onChange={e => setForm(p => ({ ...p, emergencyContactName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Emergency Contact Phone</Label><Input value={form.emergencyContactPhone} onChange={e => setForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Child"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Absence Dialog */}
      <Dialog open={showAbsence} onOpenChange={setShowAbsence}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report Absence for {selectedPupil?.fullName}</DialogTitle></DialogHeader>
          <form onSubmit={handleReportAbsence} className="space-y-4">
            <div className="space-y-1">
              <Label>Absence Date *</Label>
              <Input type="date" value={absenceForm.date} onChange={e => setAbsenceForm(p => ({ ...p, date: e.target.value }))} required min={new Date().toISOString().split('T')[0]} />
              <p className="text-xs text-gray-500 dark:text-gray-400">Absences must be reported at least 48 hours in advance when possible</p>
            </div>
            <div className="space-y-1">
              <Label>Reason (optional)</Label>
              <Input value={absenceForm.reason} onChange={e => setAbsenceForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. Illness, appointment" />
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              The driver and admin will be automatically notified of this absence.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAbsence(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Report Absence"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showGuardian} onOpenChange={setShowGuardian}>
        <DialogContent>
          <DialogHeader><DialogTitle>Authorize Pickup Guardian for {selectedPupil?.fullName}</DialogTitle></DialogHeader>
          <form onSubmit={handleGuardianSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Guardian Name *</Label><Input value={guardianForm.name} onChange={e => setGuardianForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Relationship *</Label><Input value={guardianForm.relationship} onChange={e => setGuardianForm(p => ({ ...p, relationship: e.target.value }))} placeholder="e.g. Grandparent" required /></div>
              <div className="space-y-1"><Label>Valid Until</Label><Input type="date" value={guardianForm.validUntil} onChange={e => setGuardianForm(p => ({ ...p, validUntil: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={guardianForm.phone} onChange={e => setGuardianForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={guardianForm.email} onChange={e => setGuardianForm(p => ({ ...p, email: e.target.value }))} /></div>
            </div>
            {lastGuardianCredentials && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 space-y-2">
                <p className="font-semibold">Share these pickup credentials securely with the guardian. The PIN is shown once.</p>
                <p>PIN: <span className="font-mono tracking-widest">{lastGuardianCredentials.pickupPin}</span></p>
                <p className="break-all text-xs">QR payload: {lastGuardianCredentials.qrCodeData}</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowGuardian(false)}>Close</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Guardian"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showRouteChange} onOpenChange={setShowRouteChange}>
        <DialogContent>
          <DialogHeader><DialogTitle>Temporary Route Change for {selectedPupil?.fullName}</DialogTitle></DialogHeader>
          <form onSubmit={handleRouteChange} className="space-y-4">
            <div className="space-y-1">
              <Label>Requested Route *</Label>
              <Select value={routeChangeForm.requestedScheduleId} onValueChange={v => setRouteChangeForm(p => ({ ...p, requestedScheduleId: v }))}>
                <SelectTrigger><SelectValue placeholder="Choose a temporary route" /></SelectTrigger>
                <SelectContent>
                  {routeOptions.map((route: any) => <SelectItem key={route.id} value={route.id}>{route.routeName} · {route.departureTime} · {route.school?.name || 'School'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Start Date *</Label>
                <Input type="date" value={routeChangeForm.startDate} onChange={e => setRouteChangeForm(p => ({ ...p, startDate: e.target.value }))} required min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-1">
                <Label>End Date</Label>
                <Input type="date" value={routeChangeForm.endDate} onChange={e => setRouteChangeForm(p => ({ ...p, endDate: e.target.value }))} min={routeChangeForm.startDate || new Date().toISOString().split('T')[0]} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reason / notes</Label>
              <Input value={routeChangeForm.reason} onChange={e => setRouteChangeForm(p => ({ ...p, reason: e.target.value }))} placeholder="e.g. temporary address change, activity week" />
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              Admin operations will review availability and confirm this temporary change before it affects the assigned route.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowRouteChange(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Request"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}
