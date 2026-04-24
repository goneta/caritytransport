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
import { Plus, Loader2, AlertTriangle, Pencil, Trash2, Eye, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate, isExpiringSoon, isExpired } from "@/lib/utils"

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", address: "", phone: "", insuranceExpiry: "", contractStatus: "ACTIVE" })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showView, setShowView] = useState(false)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const fetchCompanies = () => {
    setLoading(true)
    fetch("/api/admin/companies").then(r => r.json()).then(d => { setCompanies(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { fetchCompanies() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { toast.success("Company added"); setShowAdd(false); fetchCompanies() }
    else toast.error("Failed to add company")
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/companies", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Company updated"); setShowEdit(false); fetchCompanies() }
    else toast.error("Failed to update company")
  }

  return (
    <DashboardLayout title="Transport Companies">
      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          <div className="flex gap-1 border rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Button onClick={() => { setForm({ name: "", address: "", phone: "", insuranceExpiry: "", contractStatus: "ACTIVE" }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Add Company
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No companies found</p>
            ) : companies.map(c => (
              <Card key={c.id} className={`hover:shadow-md transition-shadow ${isExpiringSoon(c.insuranceExpiry, 30) ? "border-yellow-300" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <button onClick={() => { setViewTarget(c); setShowView(true) }} className="font-semibold text-sm hover:underline text-left">{c.name}</button>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{c.address}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewTarget(c); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({...c, insuranceExpiry: c.insuranceExpiry ? c.insuranceExpiry.split('T')[0] : ''}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(c); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> {c.phone || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Fleet:</span> {c.vehicles?.length || 0}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Drivers:</span> {c.drivers?.length || 0}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Insurance:</span> {formatDate(c.insuranceExpiry)}</div>
                  </div>
                  <Badge variant={c.contractStatus === 'ACTIVE' ? 'success' : c.contractStatus === 'SUSPENDED' ? 'destructive' : 'warning'}>{c.contractStatus}</Badge>
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
                    <TableHead>Company</TableHead><TableHead>Phone</TableHead><TableHead>Fleet</TableHead><TableHead>Drivers</TableHead><TableHead>Insurance Expiry</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No companies found</TableCell></TableRow>
                  ) : companies.map(c => (
                    <TableRow key={c.id} className={isExpiringSoon(c.insuranceExpiry, 30) ? "bg-yellow-50" : ""}>
                      <TableCell>
                        <button onClick={() => { setViewTarget(c); setShowView(true) }} className="font-medium hover:underline text-left">{c.name}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{c.address}</p>
                      </TableCell>
                      <TableCell className="text-sm">{c.phone || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{c.vehicles?.length || 0}</TableCell>
                      <TableCell className="text-sm">{c.drivers?.length || 0}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {(isExpiringSoon(c.insuranceExpiry, 30) || isExpired(c.insuranceExpiry)) && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                          <span className={`text-sm ${isExpired(c.insuranceExpiry) ? 'text-red-600 font-semibold' : isExpiringSoon(c.insuranceExpiry, 30) ? 'text-orange-600' : ''}`}>{formatDate(c.insuranceExpiry)}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={c.contractStatus === 'ACTIVE' ? 'success' : c.contractStatus === 'SUSPENDED' ? 'destructive' : 'warning'}>{c.contractStatus}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setViewTarget(c); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditForm({...c, insuranceExpiry: c.insuranceExpiry ? c.insuranceExpiry.split('T')[0] : ''}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(c); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transport Company</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1"><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Insurance Expiry</Label><Input type="date" value={form.insuranceExpiry} onChange={e => setForm(p => ({ ...p, insuranceExpiry: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Contract Status</Label>
              <Select value={form.contractStatus} onValueChange={v => setForm(p => ({ ...p, contractStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Company"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-1"><Label>Company Name *</Label><Input value={editForm.name || ''} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} required /></div>
            <div className="space-y-1"><Label>Address</Label><Input value={editForm.address || ''} onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Insurance Expiry</Label><Input type="date" value={editForm.insuranceExpiry || ''} onChange={e => setEditForm((p: any) => ({ ...p, insuranceExpiry: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Contract Status</Label>
              <Select value={editForm.contractStatus || 'ACTIVE'} onValueChange={v => setEditForm((p: any) => ({ ...p, contractStatus: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Company</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              try {
                await fetch('/api/admin/companies', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget?.id }) })
                toast.success('Deleted'); setShowDelete(false); fetchCompanies()
              } catch { toast.error('Failed to delete') }
            }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Company Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400 block">Name</span><span className="font-medium">{viewTarget.name}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Address</span><span className="font-medium">{viewTarget.address || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Phone</span><span className="font-medium">{viewTarget.phone || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Fleet</span><span className="font-medium">{viewTarget.vehicles?.length || 0} vehicles</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Drivers</span><span className="font-medium">{viewTarget.drivers?.length || 0} drivers</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Insurance Expiry</span><span className="font-medium">{formatDate(viewTarget.insuranceExpiry)}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Contract Status</span><Badge variant={viewTarget.contractStatus === 'ACTIVE' ? 'success' : viewTarget.contractStatus === 'SUSPENDED' ? 'destructive' : 'warning'}>{viewTarget.contractStatus}</Badge></div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
