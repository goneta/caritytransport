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
import { Plus, Search, Trash2, Eye, Phone, Mail, Loader2, Pencil, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate } from "@/lib/utils"

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("__all__")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedParent, setSelectedParent] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", status: "ACTIVE", password: "" })
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)

  const fetchParents = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set("search", search)
    if (statusFilter && statusFilter !== "__all__") params.set("status", statusFilter)
    fetch(`/api/admin/parents?${params}`)
      .then(r => r.json())
      .then(d => { setParents(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchParents() }, [search, statusFilter])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/parents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success("Parent added"); setShowAddDialog(false); fetchParents() }
    else { const d = await res.json(); toast.error(d.error || "Failed to add parent") }
  }

  const handleStatusChange = async (id: string, status: string) => {
    const res = await fetch(`/api/admin/parents/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (res.ok) { toast.success("Status updated"); fetchParents() }
    else toast.error("Failed to update status")
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch(`/api/admin/parents/${editForm.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Parent updated"); setShowEdit(false); fetchParents() }
    else toast.error("Failed to update")
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/parents/${deleteTarget.id}`, { method: "DELETE" })
    if (res.ok) { toast.success("Parent deleted"); setShowDelete(false); setDeleteTarget(null); fetchParents() }
    else toast.error("Failed to delete parent")
  }

  const statusColor: Record<string, string> = {
    ACTIVE: "success",
    SUSPENDED: "destructive",
    PENDING: "warning",
  }

  return (
    <DashboardLayout title="Parents">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <Input placeholder="Search parents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 border rounded-lg p-0.5">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <Button onClick={() => { setForm({ name: "", email: "", phone: "", address: "", status: "ACTIVE", password: "" }); setShowAddDialog(true) }}>
              <Plus className="h-4 w-4" /> Add Parent
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {parents.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No parents found</p>
            ) : parents.map(parent => (
              <Card key={parent.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold">{parent.name?.charAt(0)}</div>
                      <div className="min-w-0">
                        <button onClick={() => { setSelectedParent(parent); setShowViewDialog(true) }} className="font-semibold text-sm hover:underline text-left">{parent.name}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{parent.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1"><Phone className="h-3 w-3 text-gray-400 dark:text-gray-500" /> {parent.phone || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Children:</span> {parent.parent?.pupils?.length || 0}</div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={statusColor[parent.status] as any || "secondary"}>{parent.status}</Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{formatDate(parent.createdAt)}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedParent(parent); setShowViewDialog(true) }} className="w-full">
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditForm({...parent}); setShowEdit(true) }} className="w-full">
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setDeleteTarget(parent); setShowDelete(true) }} className="w-full text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Children</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parents.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No parents found</TableCell></TableRow>
                  ) : parents.map(parent => (
                    <TableRow key={parent.id}>
                      <TableCell>
                        <button onClick={() => { setSelectedParent(parent); setShowViewDialog(true) }} className="font-medium hover:underline text-left">{parent.name}</button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"><Mail className="h-3 w-3" />{parent.email}</div>
                          {parent.phone && <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400"><Phone className="h-3 w-3" />{parent.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{parent.parent?.pupils?.length || 0} child{(parent.parent?.pupils?.length || 0) !== 1 ? 'ren' : ''}</span>
                      </TableCell>
                      <TableCell><Badge variant={statusColor[parent.status] as any || "secondary"}>{parent.status}</Badge></TableCell>
                      <TableCell className="text-sm text-gray-500 dark:text-gray-400">{formatDate(parent.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => { setSelectedParent(parent); setShowViewDialog(true) }}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditForm({...parent}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                          {parent.status === 'PENDING' && (
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => handleStatusChange(parent.id, 'ACTIVE')}>Approve</Button>
                          )}
                          {parent.status === 'ACTIVE' && (
                            <Button variant="ghost" size="sm" className="text-red-600 text-xs" onClick={() => handleStatusChange(parent.id, 'SUSPENDED')}>Suspend</Button>
                          )}
                          {parent.status === 'SUSPENDED' && (
                            <Button variant="ghost" size="sm" className="text-green-600 text-xs" onClick={() => handleStatusChange(parent.id, 'ACTIVE')}>Activate</Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(parent); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                        </div>
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
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Add Parent</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Password *</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required /></div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Parent"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Parent Details</DialogTitle></DialogHeader>
          {selectedParent && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-lg font-bold">
                  {selectedParent.name?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-lg">{selectedParent.name}</p>
                  <Badge variant={statusColor[selectedParent.status] as any || "secondary"}>{selectedParent.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-gray-500 dark:text-gray-400">Email</p><p>{selectedParent.email}</p></div>
                <div><p className="text-gray-500 dark:text-gray-400">Phone</p><p>{selectedParent.phone || 'N/A'}</p></div>
                <div className="col-span-2"><p className="text-gray-500 dark:text-gray-400">Address</p><p>{selectedParent.address || 'N/A'}</p></div>
              </div>
              <div>
                <p className="font-semibold mb-2">Children ({selectedParent.parent?.pupils?.length || 0})</p>
                {selectedParent.parent?.pupils?.length > 0 ? (
                  <div className="space-y-2">
                    {selectedParent.parent.pupils.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{p.fullName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{p.yearLevel} - {p.school?.name || 'No school'}</p>
                        </div>
                        <Badge variant={p.activeTransport ? "success" : "secondary"}>
                          {p.activeTransport ? "Active Transport" : "No Transport"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-gray-500 dark:text-gray-400">No children registered</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl"><DialogHeader><DialogTitle>Edit Parent</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Name</Label><Input value={editForm.name || ""} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Email</Label><Input type="email" value={editForm.email || ""} onChange={e => setEditForm((p: any) => ({ ...p, email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone || ""} onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editForm.status || 'ACTIVE'} onValueChange={v => setEditForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Address</Label><Input value={editForm.address || ""} onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Parent</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This will also remove all their data. This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
