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
import { Plus, Search, Eye, Loader2, AlertTriangle, Pencil, Trash2, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate, isExpiringSoon, isExpired } from "@/lib/utils"

const statusBadge: Record<string, string> = {
  ACTIVE: "success", ON_LEAVE: "warning", SUSPENDED: "destructive"
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<any>(null)
  const [showView, setShowView] = useState(false)
  const [form, setForm] = useState({
    name: "", email: "", phone: "", password: "", companyId: "",
    licenceNumber: "", licenceClass: "", licenceExpiry: "", dbsCheckDate: "", vehicleId: ""
  })
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const fetchAll = () => {
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/drivers?search=${search}`).then(r => r.json()),
      fetch("/api/admin/companies").then(r => r.json()),
      fetch("/api/admin/vehicles").then(r => r.json()),
    ]).then(([d, c, v]) => {
      setDrivers(Array.isArray(d) ? d : [])
      setCompanies(Array.isArray(c) ? c : [])
      setVehicles(Array.isArray(v) ? v : [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { fetchAll() }, [search])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success("Driver added"); setShowAdd(false); fetchAll() }
    else { const d = await res.json(); toast.error(d.error || "Failed to add driver") }
  }

  const getLicenceStatus = (driver: any) => {
    if (isExpired(driver.licenceExpiry)) return <Badge variant="destructive">EXPIRED</Badge>
    if (isExpiringSoon(driver.licenceExpiry, 60)) return <Badge variant="warning">EXPIRING SOON</Badge>
    return <Badge variant="success">VALID</Badge>
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/drivers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Driver updated"); setShowEdit(false); fetchAll() }
    else toast.error("Failed to update")
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/drivers?id=${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Deleted"); setShowDelete(false); setDeleteTarget(null); fetchAll() }
    else toast.error("Failed to delete")
  }

  return (
    <DashboardLayout title="Drivers">
      <div className="space-y-6">
        <div className="flex gap-3 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 border rounded-lg p-0.5">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <Button onClick={() => { setForm({ name: "", email: "", phone: "", password: "", companyId: "", licenceNumber: "", licenceClass: "", licenceExpiry: "", dbsCheckDate: "", vehicleId: "" }); setShowAdd(true) }}>
              <Plus className="h-4 w-4" /> Add Driver
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No drivers found</p>
            ) : drivers.map(driver => (
              <Card key={driver.id} className={`hover:shadow-md transition-shadow ${isExpiringSoon(driver.licenceExpiry, 60) ? 'border-yellow-300' : ''}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{driver.user?.name?.charAt(0)}</div>
                      <div>
                        <button onClick={() => { setSelectedDriver(driver); setShowView(true) }} className="font-semibold text-sm hover:underline text-left">{driver.user?.name}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{driver.user?.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setSelectedDriver(driver); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({ id: driver.id, name: driver.user?.name, email: driver.user?.email, phone: driver.user?.phone, licenceNumber: driver.licenceNumber, licenceClass: driver.licenceClass, licenceExpiry: driver.licenceExpiry ? driver.licenceExpiry.split('T')[0] : '', dbsCheckDate: driver.dbsCheckDate ? driver.dbsCheckDate.split('T')[0] : '' }); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(driver); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Company:</span> {driver.company?.name || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Vehicle:</span> {driver.vehicle?.regPlate || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Licence:</span> <span className="font-mono">{driver.licenceNumber}</span></div>
                    <div><span className="text-gray-500 dark:text-gray-400">Expiry:</span> <span className={isExpired(driver.licenceExpiry) ? 'text-red-600' : isExpiringSoon(driver.licenceExpiry, 60) ? 'text-orange-600' : ''}>{formatDate(driver.licenceExpiry)}</span></div>
                  </div>
                  <div className="flex gap-2">
                    {getLicenceStatus(driver)}
                    <Badge variant={statusBadge[driver.driverStatus] as any || "secondary"}>{driver.driverStatus}</Badge>
                  </div>
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
                    <TableHead>Driver</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Licence</TableHead>
                    <TableHead>Licence Expiry</TableHead>
                    <TableHead>DBS Date</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {drivers.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center text-gray-500 py-8">No drivers found</TableCell></TableRow>
                  ) : drivers.map(driver => (
                    <TableRow key={driver.id} className={isExpiringSoon(driver.licenceExpiry, 60) ? "bg-yellow-50" : ""}>
                      <TableCell>
                        <div>
                          <button onClick={() => { setSelectedDriver(driver); setShowView(true) }} className="font-medium text-sm hover:underline text-left">{driver.user?.name}</button>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{driver.user?.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{driver.company?.name || 'N/A'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-mono">{driver.licenceNumber}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{driver.licenceClass}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(isExpiringSoon(driver.licenceExpiry, 60) || isExpired(driver.licenceExpiry)) && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                          <span className={`text-sm ${isExpired(driver.licenceExpiry) ? 'text-red-600 font-semibold' : isExpiringSoon(driver.licenceExpiry, 60) ? 'text-orange-600' : ''}`}>
                            {formatDate(driver.licenceExpiry)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(driver.dbsCheckDate)}</TableCell>
                      <TableCell className="text-sm">{driver.vehicle?.regPlate || 'N/A'}</TableCell>
                      <TableCell>{getLicenceStatus(driver)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setSelectedDriver(driver); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditForm({ id: driver.id, name: driver.user?.name, email: driver.user?.email, phone: driver.user?.phone, licenceNumber: driver.licenceNumber, licenceClass: driver.licenceClass, licenceExpiry: driver.licenceExpiry ? driver.licenceExpiry.split('T')[0] : '', dbsCheckDate: driver.dbsCheckDate ? driver.dbsCheckDate.split('T')[0] : '' }); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(driver); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Driver</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Default: driver123" /></div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Select value={form.companyId} onValueChange={v => setForm(p => ({ ...p, companyId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{companies.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Assigned Vehicle</Label>
                <Select value={form.vehicleId} onValueChange={v => setForm(p => ({ ...p, vehicleId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.regPlate} ({v.type})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Licence Number</Label><Input value={form.licenceNumber} onChange={e => setForm(p => ({ ...p, licenceNumber: e.target.value }))} /></div>
              <div className="space-y-1">
                <Label>Licence Class</Label>
                <Select value={form.licenceClass} onValueChange={v => setForm(p => ({ ...p, licenceClass: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAR">Car</SelectItem>
                    <SelectItem value="MINIBUS">Minibus</SelectItem>
                    <SelectItem value="PCV">Full Bus (PCV)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Licence Expiry</Label><Input type="date" value={form.licenceExpiry} onChange={e => setForm(p => ({ ...p, licenceExpiry: e.target.value }))} /></div>
              <div className="space-y-1"><Label>DBS Check Date</Label><Input type="date" value={form.dbsCheckDate} onChange={e => setForm(p => ({ ...p, dbsCheckDate: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Driver"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Driver Details</DialogTitle></DialogHeader>
          {selectedDriver && (
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold">
                  {selectedDriver.user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-base">{selectedDriver.user?.name}</p>
                  <p className="text-gray-500 dark:text-gray-400">{selectedDriver.user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <div><p className="text-gray-500 dark:text-gray-400">Phone</p><p>{selectedDriver.user?.phone || 'N/A'}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Company</p><p>{selectedDriver.company?.name || 'N/A'}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Licence No.</p><p className="font-mono">{selectedDriver.licenceNumber}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Class</p><p>{selectedDriver.licenceClass}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Licence Expiry</p><p className={isExpired(selectedDriver.licenceExpiry) ? "text-red-600 font-semibold" : isExpiringSoon(selectedDriver.licenceExpiry, 60) ? "text-orange-600" : ""}>{formatDate(selectedDriver.licenceExpiry)}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">DBS Date</p><p>{formatDate(selectedDriver.dbsCheckDate)}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Vehicle</p><p>{selectedDriver.vehicle?.regPlate || 'N/A'}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Status</p><p><Badge variant={statusBadge[selectedDriver.driverStatus] as any || "secondary"}>{selectedDriver.driverStatus}</Badge></p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Driver</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editForm.name || ""} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={editForm.email || ""} onChange={e => setEditForm((p: any) => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone || ""} onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Licence Number</Label><Input value={editForm.licenceNumber || ""} onChange={e => setEditForm((p: any) => ({ ...p, licenceNumber: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Licence Expiry</Label><Input type="date" value={editForm.licenceExpiry || ""} onChange={e => setEditForm((p: any) => ({ ...p, licenceExpiry: e.target.value }))} /></div>
              <div className="space-y-1"><Label>DBS Check Date</Label><Input type="date" value={editForm.dbsCheckDate || ""} onChange={e => setEditForm((p: any) => ({ ...p, dbsCheckDate: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Driver</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.user?.name}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
