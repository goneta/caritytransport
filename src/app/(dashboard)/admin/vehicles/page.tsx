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
import { Plus, Loader2, AlertTriangle, Bus, Pencil, Trash2, Eye, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate, isExpiringSoon, isExpired } from "@/lib/utils"

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ companyId: "", type: "BUS", regPlate: "", model: "", seats: "", motExpiry: "" })
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showView, setShowView] = useState(false)
  const [viewTarget, setViewTarget] = useState<any>(null)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/vehicles").then(r => r.json()),
      fetch("/api/admin/companies").then(r => r.json()),
    ]).then(([v, c]) => {
      setVehicles(Array.isArray(v) ? v : [])
      setCompanies(Array.isArray(c) ? c : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success("Vehicle added"); setShowAdd(false); fetchAll() }
    else { const d = await res.json(); toast.error(d.error || "Failed to add vehicle") }
  }

  const typeIcon: Record<string, string> = { BUS: "\u{1F68C}", MINIBUS: "\u{1F690}", CAR: "\u{1F697}" }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/vehicles", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Vehicle updated"); setShowEdit(false); fetchAll() }
    else toast.error("Failed to update")
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/vehicles?id=${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Deleted"); setShowDelete(false); setDeleteTarget(null); fetchAll() }
    else toast.error("Failed to delete")
  }

  return (
    <DashboardLayout title="Vehicles">
      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          <div className="flex gap-1 border rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Button onClick={() => { setForm({ companyId: "", type: "BUS", regPlate: "", model: "", seats: "", motExpiry: "" }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No vehicles found</p>
            ) : vehicles.map(v => {
              const totalAssigned = v.schedules?.reduce((sum: number, s: any) => sum + (s._count?.seatAssignments || 0), 0) || 0
              const utilPct = v.seats > 0 ? Math.min(Math.round((totalAssigned / v.seats) * 100), 100) : 0
              return (
                <Card key={v.id} className={`hover:shadow-md transition-shadow ${isExpiringSoon(v.motExpiry, 30) ? 'border-yellow-300' : ''}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{typeIcon[v.type] || '\u{1F697}'}</span>
                        <div>
                          <button onClick={() => { setViewTarget(v); setShowView(true) }} className="font-semibold text-sm font-mono hover:underline text-left">{v.regPlate}</button>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{v.model}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setViewTarget(v); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditForm({...v, motExpiry: v.motExpiry ? v.motExpiry.split('T')[0] : ''}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(v); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500 dark:text-gray-400">Company:</span> {v.company?.name || 'N/A'}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">Type:</span> {v.type}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">Seats:</span> {v.seats}</div>
                      <div><span className="text-gray-500 dark:text-gray-400">MOT:</span> <span className={isExpired(v.motExpiry) ? 'text-red-600 font-semibold' : isExpiringSoon(v.motExpiry, 30) ? 'text-orange-600' : ''}>{formatDate(v.motExpiry)}</span></div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={v.status === 'ACTIVE' ? 'success' : 'destructive'}>{v.status}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">{utilPct}%</span>
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                          <div className={`h-full rounded-full ${utilPct >= 100 ? 'bg-red-500' : utilPct > 75 ? 'bg-orange-400' : 'bg-green-500'}`} style={{ width: `${utilPct}%` }} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>MOT Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Utilisation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehicles.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">No vehicles found</TableCell></TableRow>
                  ) : vehicles.map(v => {
                    const totalAssigned = v.schedules?.reduce((sum: number, s: any) => sum + (s._count?.seatAssignments || 0), 0) || 0
                    const utilPct = v.seats > 0 ? Math.min(Math.round((totalAssigned / v.seats) * 100), 100) : 0
                    return (
                      <TableRow key={v.id} className={isExpiringSoon(v.motExpiry, 30) ? "bg-yellow-50" : ""}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{typeIcon[v.type] || '\u{1F697}'}</span>
                            <div>
                              <button onClick={() => { setViewTarget(v); setShowView(true) }} className="font-medium font-mono hover:underline text-left">{v.regPlate}</button>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{v.model}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{v.company?.name}</TableCell>
                        <TableCell className="text-sm">{v.type}</TableCell>
                        <TableCell className="text-sm font-medium">{v.seats}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {(isExpiringSoon(v.motExpiry, 30) || isExpired(v.motExpiry)) && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                            <span className={`text-sm ${isExpired(v.motExpiry) ? 'text-red-600 font-semibold' : isExpiringSoon(v.motExpiry, 30) ? 'text-orange-600' : ''}`}>
                              {formatDate(v.motExpiry)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={v.status === 'ACTIVE' ? 'success' : 'destructive'}>{v.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">{utilPct}%</span>
                            <div className="w-20 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
                              <div className={`h-full rounded-full ${utilPct >= 100 ? 'bg-red-500' : utilPct > 75 ? 'bg-orange-400' : 'bg-green-500'}`}
                                style={{ width: `${utilPct}%` }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => { setViewTarget(v); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditForm({...v, motExpiry: v.motExpiry ? v.motExpiry.split('T')[0] : ''}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(v); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Company *</Label>
                <Select value={form.companyId} onValueChange={v => setForm(p => ({ ...p, companyId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUS">Bus</SelectItem>
                    <SelectItem value="MINIBUS">Minibus</SelectItem>
                    <SelectItem value="CAR">Car</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Reg Plate *</Label><Input value={form.regPlate} onChange={e => setForm(p => ({ ...p, regPlate: e.target.value }))} placeholder="LN71 ABC" required /></div>
              <div className="space-y-1"><Label>Model</Label><Input value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="Mercedes Sprinter" /></div>
              <div className="space-y-1"><Label>Number of Seats *</Label><Input type="number" value={form.seats} onChange={e => setForm(p => ({ ...p, seats: e.target.value }))} min="1" required /></div>
              <div className="space-y-1"><Label>MOT Expiry</Label><Input type="date" value={form.motExpiry} onChange={e => setForm(p => ({ ...p, motExpiry: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.companyId}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Vehicle"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit Vehicle</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Reg Plate</Label><Input value={editForm.regPlate || ""} onChange={e => setEditForm((p: any) => ({ ...p, regPlate: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Model</Label><Input value={editForm.model || ""} onChange={e => setEditForm((p: any) => ({ ...p, model: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Seats</Label><Input type="number" value={editForm.seats || ""} onChange={e => setEditForm((p: any) => ({ ...p, seats: e.target.value }))} /></div>
              <div className="space-y-1"><Label>MOT Expiry</Label><Input type="date" value={editForm.motExpiry || ""} onChange={e => setEditForm((p: any) => ({ ...p, motExpiry: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editForm.status || 'ACTIVE'} onValueChange={v => setEditForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="INACTIVE">Inactive</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Vehicle</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.regPlate}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Vehicle Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400 block">Reg Plate</span><span className="font-medium font-mono">{viewTarget.regPlate}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Model</span><span className="font-medium">{viewTarget.model || "N/A"}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Type</span><span className="font-medium">{viewTarget.type}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Company</span><span className="font-medium">{viewTarget.company?.name || "N/A"}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Seats</span><span className="font-medium">{viewTarget.seats}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">MOT Expiry</span><span className={`font-medium ${isExpired(viewTarget.motExpiry) ? 'text-red-600' : isExpiringSoon(viewTarget.motExpiry, 30) ? 'text-orange-600' : ''}`}>{formatDate(viewTarget.motExpiry)}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Status</span><Badge variant={viewTarget.status === 'ACTIVE' ? 'success' : 'destructive'}>{viewTarget.status}</Badge></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
