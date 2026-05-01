"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Eye, Loader2, GraduationCap, AlertTriangle, Pencil, Trash2, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate } from "@/lib/utils"

export default function PupilsPage() {
  const [pupils, setPupils] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedPupil, setSelectedPupil] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    fullName: "", dateOfBirth: "", yearLevel: "", studentNumber: "",
    schoolId: "", parentId: "", pickupLocation: "", specialRequirements: "",
    emergencyContactName: "", emergencyContactPhone: ""
  })
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const selectableParents = parents.filter((par: any) => Boolean(par.parent?.id))

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/pupils?search=${search}`).then(r => r.json()),
      fetch("/api/admin/parents").then(r => r.json()),
      fetch("/api/admin/schools").then(r => r.json()),
    ]).then(([p, par, s]) => {
      setPupils(Array.isArray(p) ? p : [])
      setParents(Array.isArray(par) ? par : [])
      setSchools(Array.isArray(s) ? s : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [search])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/pupils", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        dateOfBirth: form.dateOfBirth || null,
        schoolId: form.schoolId || null,
        activeTransport: true,
      }),
    })
    setSaving(false)
    if (res.ok) { toast.success("Pupil added"); setShowAddDialog(false); fetchAll() }
    else { const d = await res.json(); toast.error(d.error || "Failed to add pupil") }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/pupils", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Pupil updated"); setShowEdit(false); fetchAll() }
    else toast.error("Failed to update")
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/pupils?id=${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Deleted"); setShowDelete(false); setDeleteTarget(null); fetchAll() }
    else toast.error("Failed to delete")
  }

  return (
    <DashboardLayout title="Pupils">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input placeholder="Search pupils..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 border rounded-lg p-0.5">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <Button onClick={() => { setForm({ fullName: "", dateOfBirth: "", yearLevel: "", studentNumber: "", schoolId: "", parentId: "", pickupLocation: "", specialRequirements: "", emergencyContactName: "", emergencyContactPhone: "" }); setShowAddDialog(true) }}>
              <Plus className="h-4 w-4" /> Add Pupil
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pupils.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No pupils found</p>
            ) : pupils.map(pupil => (
              <Card key={pupil.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <GraduationCap className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div>
                        <button onClick={() => { setSelectedPupil(pupil); setShowViewDialog(true) }} className="font-semibold text-sm hover:underline text-left">{pupil.fullName}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{pupil.studentNumber}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedPupil(pupil); setShowViewDialog(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({...pupil}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(pupil); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Year:</span> {pupil.yearLevel || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">School:</span> {pupil.school?.name || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Parent:</span> {pupil.parent?.user?.name || 'N/A'}</div>
                    <div>
                      {pupil.seatAssignments?.length > 0 ? (
                        <Badge variant="success">{pupil.seatAssignments[0].schedule?.routeName}</Badge>
                      ) : (
                        <Badge variant="secondary">Unassigned</Badge>
                      )}
                    </div>
                  </div>
                  {pupil.specialRequirements && (
                    <p className="text-xs text-orange-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{pupil.specialRequirements}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pupil</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Special</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pupils.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No pupils found</TableCell></TableRow>
                  ) : pupils.map(pupil => (
                    <TableRow key={pupil.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <GraduationCap className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                          </div>
                          <div>
                            <button onClick={() => { setSelectedPupil(pupil); setShowViewDialog(true) }} className="font-medium text-sm hover:underline text-left">{pupil.fullName}</button>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{pupil.studentNumber}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{pupil.yearLevel || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{pupil.school?.name || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{pupil.parent?.user?.name || 'N/A'}</TableCell>
                      <TableCell>
                        {pupil.seatAssignments?.length > 0 ? (
                          <Badge variant="success">{pupil.seatAssignments[0].schedule?.routeName}</Badge>
                        ) : (
                          <Badge variant="secondary">Unassigned</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {pupil.specialRequirements && (
                          <span className="flex items-center gap-1 text-xs text-orange-600">
                            <AlertTriangle className="h-3 w-3" />
                            {pupil.specialRequirements}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedPupil(pupil); setShowViewDialog(true) }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditForm({...pupil}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(pupil); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add Pupil</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Full Name *</Label><Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required /></div>
              <div className="space-y-1">
                <Label>Parent *</Label>
                <Select value={form.parentId} onValueChange={v => setForm(p => ({ ...p, parentId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                  <SelectContent>
                    {selectableParents.length === 0 ? (
                      <SelectItem value="__no_parents__" disabled>No parent profiles available</SelectItem>
                    ) : selectableParents.map((par: any) => (
                      <SelectItem key={par.parent.id} value={par.parent.id}>{par.name} ({par.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>School</Label>
                <Select value={form.schoolId} onValueChange={v => setForm(p => ({ ...p, schoolId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {schools.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Year Level</Label><Input value={form.yearLevel} onChange={e => setForm(p => ({ ...p, yearLevel: e.target.value }))} placeholder="e.g. Year 3" /></div>
              <div className="space-y-1"><Label>Student Number</Label><Input value={form.studentNumber} onChange={e => setForm(p => ({ ...p, studentNumber: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={e => setForm(p => ({ ...p, dateOfBirth: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label>Pickup Location</Label><Input value={form.pickupLocation} onChange={e => setForm(p => ({ ...p, pickupLocation: e.target.value }))} placeholder="Defaults to parent address" /></div>
              <div className="space-y-1 col-span-2"><Label>Special Requirements</Label><Input value={form.specialRequirements} onChange={e => setForm(p => ({ ...p, specialRequirements: e.target.value }))} placeholder="Wheelchair, nut allergy, etc." /></div>
              <div className="space-y-1"><Label>Emergency Contact Name</Label><Input value={form.emergencyContactName} onChange={e => setForm(p => ({ ...p, emergencyContactName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Emergency Contact Phone</Label><Input value={form.emergencyContactPhone} onChange={e => setForm(p => ({ ...p, emergencyContactPhone: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Pupil"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Pupil Details</DialogTitle></DialogHeader>
          {selectedPupil && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="font-semibold text-base">{selectedPupil.fullName}</p>
                  <p className="text-gray-500 dark:text-gray-400">{selectedPupil.yearLevel} · {selectedPupil.studentNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div><p className="text-gray-500 dark:text-gray-400">School</p><p className="font-medium">{selectedPupil.school?.name || 'N/A'}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Parent</p><p className="font-medium">{selectedPupil.parent?.user?.name || 'N/A'}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">DOB</p><p>{formatDate(selectedPupil.dateOfBirth)}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Transport</p><p><Badge variant={selectedPupil.activeTransport ? "success" : "secondary"}>{selectedPupil.activeTransport ? "Active" : "Inactive"}</Badge></p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Pickup</p><p>{selectedPupil.pickupLocation || 'N/A'}</p></div>
              </div>
              {selectedPupil.specialRequirements && (
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-orange-700 font-medium flex items-center gap-1"><AlertTriangle className="h-4 w-4" />Special Requirements</p>
                  <p className="text-orange-700 mt-1">{selectedPupil.specialRequirements}</p>
                </div>
              )}
              {selectedPupil.seatAssignments?.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Assigned Routes</p>
                  {selectedPupil.seatAssignments.map((a: any) => (
                    <div key={a.id} className="bg-gray-50 p-2 rounded-lg mb-1">
                      <p className="font-medium">{a.schedule?.routeName}</p>
                      <p className="text-gray-500 dark:text-gray-400 text-xs">Departure: {a.schedule?.departureTime}</p>
                    </div>
                  ))}
                </div>
              )}
              {selectedPupil.emergencyContactName && (
                <div><p className="text-gray-500 dark:text-gray-400">Emergency Contact</p><p>{selectedPupil.emergencyContactName} · {selectedPupil.emergencyContactPhone}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Pupil</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name</Label><Input value={editForm.fullName || ""} onChange={e => setEditForm((p: any) => ({ ...p, fullName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Year Level</Label><Input value={editForm.yearLevel || ""} onChange={e => setEditForm((p: any) => ({ ...p, yearLevel: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Student Number</Label><Input value={editForm.studentNumber || ""} onChange={e => setEditForm((p: any) => ({ ...p, studentNumber: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Pickup Location</Label><Input value={editForm.pickupLocation || ""} onChange={e => setEditForm((p: any) => ({ ...p, pickupLocation: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label>Special Requirements</Label><Input value={editForm.specialRequirements || ""} onChange={e => setEditForm((p: any) => ({ ...p, specialRequirements: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Emergency Contact Name</Label><Input value={editForm.emergencyContactName || ""} onChange={e => setEditForm((p: any) => ({ ...p, emergencyContactName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Emergency Contact Phone</Label><Input value={editForm.emergencyContactPhone || ""} onChange={e => setEditForm((p: any) => ({ ...p, emergencyContactPhone: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Pupil</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.fullName}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
