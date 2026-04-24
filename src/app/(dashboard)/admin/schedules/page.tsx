"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Eye, Loader2, Copy, AlertCircle, CheckCircle2, X, Pencil, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

interface Schedule {
  id: string
  routeName: string
  serviceType: string
  direction: string
  departureTime: string
  arrivalTime?: string
  recurrence: string
  pickupPostcode?: string
  dropoffPostcode?: string
  pricePerSeat: number
  status: string
  school?: { name: string }
  vehicle?: { regPlate: string; model?: string; seats: number; type: string; licenceClass: string }
  driver?: { user: { name?: string }; licenceClass?: string }
  _count?: { seatAssignments: number }
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("__all__")
  const [serviceFilter, setServiceFilter] = useState("__all__")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [driverConflict, setDriverConflict] = useState("")
  const [licenceWarning, setLicenceWarning] = useState("")
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null)

  const defaultForm = {
    routeName: "", serviceType: "BOTH", direction: "HOME_TO_SCHOOL",
    schoolId: "", vehicleId: "", driverId: "", departureTime: "",
    arrivalTime: "", scheduleDate: "", recurrence: "WEEKDAYS",
    customDays: [] as string[], pickupPostcode: "", dropoffPostcode: "",
    dropoffLocation: "", pricePerSeat: "0",
  }
  const [form, setForm] = useState(defaultForm)
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showViewDetail, setShowViewDetail] = useState(false)
  const [viewTarget, setViewTarget] = useState<any>(null)

  const fetchAll = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter && statusFilter !== "__all__") params.set("status", statusFilter)
    if (serviceFilter && serviceFilter !== "__all__") params.set("serviceType", serviceFilter)

    Promise.all([
      fetch(`/api/admin/schedules?${params}`).then(r => r.json()),
      fetch("/api/admin/schools").then(r => r.json()),
      fetch("/api/admin/drivers").then(r => r.json()),
      fetch("/api/admin/vehicles").then(r => r.json()),
    ]).then(([s, sc, d, v]) => {
      setSchedules(Array.isArray(s) ? s : [])
      setSchools(Array.isArray(sc) ? sc : [])
      setDrivers(Array.isArray(d) ? d : [])
      setVehicles(Array.isArray(v) ? v : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [statusFilter, serviceFilter])

  // Validate driver licence vs vehicle type
  const validateDriverVehicle = (driverId: string, vehicleId: string) => {
    if (!driverId || !vehicleId) { setLicenceWarning(""); return }
    const driver = drivers.find(d => d.id === driverId)
    const vehicle = vehicles.find(v => v.id === vehicleId)
    if (!driver || !vehicle) { setLicenceWarning(""); return }

    const classMap: Record<string, string[]> = {
      BUS: ["PCV"],
      MINIBUS: ["PCV", "MINIBUS"],
      CAR: ["CAR", "MINIBUS", "PCV"],
    }
    const allowed = classMap[vehicle.type] || []
    if (driver.licenceClass && !allowed.includes(driver.licenceClass)) {
      setLicenceWarning(`⚠️ Driver licence class (${driver.licenceClass}) cannot drive ${vehicle.type}. Required: ${allowed.join(", ")}`)
    } else {
      setLicenceWarning("")
    }
  }

  const handleVehicleChange = (vehicleId: string) => {
    const actualId = vehicleId === "__none__" ? "" : vehicleId
    const vehicle = vehicles.find(v => v.id === actualId)
    setSelectedVehicle(vehicle || null)
    setForm(p => ({ ...p, vehicleId: actualId }))
    validateDriverVehicle(form.driverId, actualId)
  }

  const handleDriverChange = (driverId: string) => {
    const actualId = driverId === "__none__" ? "" : driverId
    setForm(p => ({ ...p, driverId: actualId }))
    validateDriverVehicle(actualId, form.vehicleId)
  }

  const toggleCustomDay = (day: string) => {
    setForm(p => ({
      ...p,
      customDays: p.customDays.includes(day)
        ? p.customDays.filter(d => d !== day)
        : [...p.customDays, day],
    }))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (licenceWarning) { toast.error("Resolve driver licence conflict first"); return }
    setSaving(true)
    const res = await fetch("/api/admin/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, pricePerSeat: parseFloat(form.pricePerSeat) || 0 }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success("Route created successfully")
      setShowAdd(false)
      setForm(defaultForm)
      setSelectedVehicle(null)
      setLicenceWarning("")
      fetchAll()
    } else {
      const d = await res.json()
      if (d.error?.includes("Driver")) setDriverConflict(d.error)
      else toast.error(d.error || "Failed to create route")
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/schedules/" + editForm.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { toast.success("Route updated"); setShowEdit(false); fetchAll() }
    else { const d = await res.json(); toast.error(d.error || "Failed to update route") }
  }

  const handleDeleteRoute = async () => {
    if (!deleteTarget) return
    const res = await fetch("/api/admin/schedules/" + deleteTarget.id, { method: "DELETE" })
    if (res.ok) { toast.success("Route deleted"); setShowDelete(false); setDeleteTarget(null); fetchAll() }
    else toast.error("Failed to delete route")
  }

    const handleClone = async (sched: Schedule) => {
    const res = await fetch("/api/admin/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeName: `${sched.routeName} (Copy)`,
        serviceType: sched.serviceType,
        direction: sched.direction,
        departureTime: sched.departureTime,
        arrivalTime: sched.arrivalTime,
        recurrence: sched.recurrence,
        pickupPostcode: sched.pickupPostcode,
        dropoffPostcode: sched.dropoffPostcode,
        pricePerSeat: sched.pricePerSeat,
      }),
    })
    if (res.ok) { toast.success("Route cloned"); fetchAll() }
    else toast.error("Failed to clone route")
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success("Status updated"); fetchAll() }
    else toast.error("Failed to update status")
  }

  const statusColor: Record<string, string> = {
    SCHEDULED: "bg-blue-100 text-blue-800",
    ACTIVE: "bg-green-100 text-green-800",
    COMPLETED: "bg-gray-100 text-gray-700 dark:text-gray-300",
    CANCELLED: "bg-red-100 text-red-800",
  }

  const serviceLabel: Record<string, string> = {
    PICKUP: "Pick-up only",
    DROPOFF: "Drop-off only",
    BOTH: "Both",
  }

  const filteredSchedules = schedules.filter(s =>
    !search ||
    s.routeName.toLowerCase().includes(search.toLowerCase()) ||
    (s.school?.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.vehicle?.regPlate || "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout title="Transport Routes">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input placeholder="Search routes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-56" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Service type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Services</SelectItem>
                <SelectItem value="PICKUP">Pick-up only</SelectItem>
                <SelectItem value="DROPOFF">Drop-off only</SelectItem>
                <SelectItem value="BOTH">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => { setForm(defaultForm); setSelectedVehicle(null); setLicenceWarning(""); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Create Route
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : filteredSchedules.length === 0 ? (
              <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                <p className="font-medium">No routes found</p>
                <p className="text-sm mt-1">Create your first transport route to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Route</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Postcodes</TableHead>
                    <TableHead>Vehicle / Driver</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Departs</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSchedules.map(sched => {
                    const assigned = sched._count?.seatAssignments || 0
                    const capacity = sched.vehicle?.seats || 0
                    const utilPct = capacity > 0 ? Math.round((assigned / capacity) * 100) : 0
                    const isFull = assigned >= capacity && capacity > 0

                    return (
                      <TableRow key={sched.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{sched.routeName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{sched.recurrence}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 dark:text-gray-300">
                            {serviceLabel[sched.serviceType] || sched.serviceType}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600 dark:text-gray-400">{sched.school?.name || "—"}</TableCell>
                        <TableCell>
                          {sched.pickupPostcode && <p className="text-xs text-gray-500 dark:text-gray-400">↑ {sched.pickupPostcode}</p>}
                          {sched.dropoffPostcode && <p className="text-xs text-gray-500 dark:text-gray-400">↓ {sched.dropoffPostcode}</p>}
                          {!sched.pickupPostcode && !sched.dropoffPostcode && <span className="text-gray-400 dark:text-gray-500 text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{sched.vehicle?.regPlate || "No vehicle"}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{sched.driver?.user?.name || "Unassigned"}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isFull ? "text-red-600" : utilPct > 75 ? "text-orange-600" : "text-green-600"}`}>
                              {assigned}/{capacity || "?"}
                            </span>
                            {capacity > 0 && (
                              <div className="w-12 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                                <div className={`h-full rounded-full ${utilPct >= 100 ? "bg-red-500" : utilPct > 75 ? "bg-orange-400" : "bg-green-500"}`}
                                  style={{ width: `${Math.min(utilPct, 100)}%` }} />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{sched.departureTime}</TableCell>
                        <TableCell className="text-sm">
                          {sched.pricePerSeat > 0 ? `£${sched.pricePerSeat.toFixed(2)}` : "Free"}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[sched.status] || "bg-gray-100"}`}>
                            {sched.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button variant="ghost" size="icon" title="View" onClick={() => { setViewTarget(sched); setShowViewDetail(true) }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditForm({ id: sched.id, routeName: sched.routeName, departureTime: sched.departureTime, arrivalTime: sched.arrivalTime || '', pricePerSeat: String(sched.pricePerSeat), status: sched.status, pickupPostcode: sched.pickupPostcode || '', dropoffPostcode: sched.dropoffPostcode || '' }); setShowEdit(true) }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Clone route" onClick={() => handleClone(sched)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete" onClick={() => { setDeleteTarget(sched); setShowDelete(true) }}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Route Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Transport Route</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {driverConflict && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{driverConflict}</span>
                <button type="button" onClick={() => setDriverConflict("")} className="ml-auto"><X className="h-4 w-4" /></button>
              </div>
            )}
            {licenceWarning && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{licenceWarning}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {/* Route Name */}
              <div className="col-span-2 space-y-1">
                <Label>Route Name *</Label>
                <Input value={form.routeName} onChange={e => setForm(p => ({ ...p, routeName: e.target.value }))}
                  placeholder="e.g. Morning Route A – St Mary's" required />
              </div>

              {/* Service Type */}
              <div className="space-y-1">
                <Label>Service Type *</Label>
                <Select value={form.serviceType} onValueChange={v => setForm(p => ({ ...p, serviceType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP">Pick-up only (Home → School)</SelectItem>
                    <SelectItem value="DROPOFF">Drop-off only (School → Home)</SelectItem>
                    <SelectItem value="BOTH">Both (Pick-up & Drop-off)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direction */}
              <div className="space-y-1">
                <Label>Trip Direction *</Label>
                <Select value={form.direction} onValueChange={v => setForm(p => ({ ...p, direction: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HOME_TO_SCHOOL">Home → School</SelectItem>
                    <SelectItem value="SCHOOL_TO_HOME">School → Home</SelectItem>
                    <SelectItem value="BOTH">Both directions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* School */}
              <div className="space-y-1">
                <Label>School</Label>
                <Select value={form.schoolId || "__none__"} onValueChange={v => setForm(p => ({ ...p, schoolId: v === "__none__" ? "" : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vehicle */}
              <div className="space-y-1">
                <Label>Vehicle *</Label>
                <Select value={form.vehicleId || "__none__"} onValueChange={handleVehicleChange}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {vehicles.map(v => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.regPlate} — {v.type} ({v.seats} seats, {v.licenceClass})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedVehicle && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Capacity: {selectedVehicle.seats} seats · Requires {selectedVehicle.licenceClass} licence
                  </p>
                )}
              </div>

              {/* Seat Count (informational) */}
              <div className="space-y-1">
                <Label>Seat Count</Label>
                <Input
                  type="number"
                  value={selectedVehicle?.seats || ""}
                  readOnly
                  placeholder="Auto from vehicle"
                  className="bg-gray-50 dark:bg-gray-800"
                />
                <p className="text-xs text-gray-400 dark:text-gray-500">Automatically set by vehicle capacity</p>
              </div>

              {/* Driver */}
              <div className="space-y-1">
                <Label>Driver</Label>
                <Select value={form.driverId || "__none__"} onValueChange={handleDriverChange}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.user?.name} ({d.licenceClass || "Unknown class"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Departure Time */}
              <div className="space-y-1">
                <Label>Departure Time *</Label>
                <Input type="time" value={form.departureTime} onChange={e => setForm(p => ({ ...p, departureTime: e.target.value }))} required />
              </div>

              {/* Arrival Time */}
              <div className="space-y-1">
                <Label>Arrival Time</Label>
                <Input type="time" value={form.arrivalTime} onChange={e => setForm(p => ({ ...p, arrivalTime: e.target.value }))} />
              </div>

              {/* Schedule Date */}
              <div className="space-y-1">
                <Label>Schedule Date (leave blank for recurring)</Label>
                <Input type="date" value={form.scheduleDate} onChange={e => setForm(p => ({ ...p, scheduleDate: e.target.value }))} />
              </div>

              {/* Recurrence */}
              <div className="space-y-1">
                <Label>Recurrence</Label>
                <Select value={form.recurrence} onValueChange={v => setForm(p => ({ ...p, recurrence: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKDAYS">Weekdays (Mon–Fri)</SelectItem>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="CUSTOM">Custom days</SelectItem>
                    <SelectItem value="NONE">Single date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Days */}
              {form.recurrence === "CUSTOM" && (
                <div className="col-span-2 space-y-1">
                  <Label>Select Days</Label>
                  <div className="flex gap-2 flex-wrap">
                    {DAYS.map(day => (
                      <button key={day} type="button"
                        onClick={() => toggleCustomDay(day)}
                        className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                          form.customDays.includes(day)
                            ? "bg-black text-white border-black"
                            : "bg-white text-gray-600 border-gray-300 dark:border-gray-700 hover:border-gray-400"
                        }`}>
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Pickup Postcode */}
              <div className="space-y-1">
                <Label>Pickup Postcode</Label>
                <Input value={form.pickupPostcode} onChange={e => setForm(p => ({ ...p, pickupPostcode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SW1A 1AA" />
              </div>

              {/* Dropoff Postcode */}
              <div className="space-y-1">
                <Label>Drop-off Postcode</Label>
                <Input value={form.dropoffPostcode} onChange={e => setForm(p => ({ ...p, dropoffPostcode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. EC1A 1BB" />
              </div>

              {/* Drop-off Location */}
              <div className="col-span-2 space-y-1">
                <Label>Drop-off Location Description</Label>
                <Input value={form.dropoffLocation} onChange={e => setForm(p => ({ ...p, dropoffLocation: e.target.value }))}
                  placeholder="e.g. School main gate, North entrance" />
              </div>

              {/* Price per Seat */}
              <div className="space-y-1">
                <Label>Price per Seat (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.pricePerSeat}
                  onChange={e => setForm(p => ({ ...p, pricePerSeat: e.target.value }))}
                  placeholder="0.00" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !!licenceWarning}>
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Route"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Edit Route Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit Route</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Route Name</Label><Input value={editForm.routeName || ""} onChange={e => setEditForm((p: any) => ({ ...p, routeName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Departure Time</Label><Input type="time" value={editForm.departureTime || ""} onChange={e => setEditForm((p: any) => ({ ...p, departureTime: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Arrival Time</Label><Input type="time" value={editForm.arrivalTime || ""} onChange={e => setEditForm((p: any) => ({ ...p, arrivalTime: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Price per Seat (\u00a3)</Label><Input type="number" step="0.01" min="0" value={editForm.pricePerSeat || ""} onChange={e => setEditForm((p: any) => ({ ...p, pricePerSeat: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editForm.status || 'SCHEDULED'} onValueChange={v => setEditForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="SCHEDULED">Scheduled</SelectItem><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem><SelectItem value="CANCELLED">Cancelled</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Pickup Postcode</Label><Input value={editForm.pickupPostcode || ""} onChange={e => setEditForm((p: any) => ({ ...p, pickupPostcode: e.target.value.toUpperCase() }))} /></div>
              <div className="space-y-1"><Label>Drop-off Postcode</Label><Input value={editForm.dropoffPostcode || ""} onChange={e => setEditForm((p: any) => ({ ...p, dropoffPostcode: e.target.value.toUpperCase() }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Route Confirmation */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Route</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.routeName}</strong>? This will also remove all seat assignments. This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRoute}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Route Detail */}
      <Dialog open={showViewDetail} onOpenChange={setShowViewDetail}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Route Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 dark:text-gray-400 block">Route Name</span><span className="font-medium">{viewTarget.routeName}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Service Type</span><span className="font-medium">{serviceLabel[viewTarget.serviceType] || viewTarget.serviceType}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Direction</span><span className="font-medium">{viewTarget.direction}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Departure</span><span className="font-medium">{viewTarget.departureTime}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Arrival</span><span className="font-medium">{viewTarget.arrivalTime || 'N/A'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Recurrence</span><span className="font-medium">{viewTarget.recurrence}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">School</span><span className="font-medium">{viewTarget.school?.name || 'N/A'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Vehicle</span><span className="font-medium">{viewTarget.vehicle?.regPlate || 'N/A'} {viewTarget.vehicle?.type ? `(${viewTarget.vehicle.type})` : ''}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Driver</span><span className="font-medium">{viewTarget.driver?.user?.name || 'Unassigned'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Price</span><span className="font-medium">{viewTarget.pricePerSeat > 0 ? `\u00a3${viewTarget.pricePerSeat.toFixed(2)}` : 'Free'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Capacity</span><span className="font-medium">{viewTarget._count?.seatAssignments || 0}/{viewTarget.vehicle?.seats || '?'} seats</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Status</span><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[viewTarget.status] || 'bg-gray-100'}`}>{viewTarget.status}</span></div>
              </div>
              {viewTarget.pickupPostcode && <div className="text-sm"><span className="text-gray-500 dark:text-gray-400">Pickup Postcode:</span> {viewTarget.pickupPostcode}</div>}
              {viewTarget.dropoffPostcode && <div className="text-sm"><span className="text-gray-500 dark:text-gray-400">Drop-off Postcode:</span> {viewTarget.dropoffPostcode}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  )
}
