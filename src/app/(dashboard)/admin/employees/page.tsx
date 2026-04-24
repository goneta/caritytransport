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
import { Plus, Search, Loader2, Pencil, Trash2, Eye, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate } from "@/lib/utils"

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", role: "ADMIN", password: "" })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showView, setShowView] = useState(false)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const fetchEmployees = () => {
    setLoading(true)
    fetch(`/api/admin/employees?search=${search}`).then(r => r.json()).then(d => { setEmployees(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { fetchEmployees() }, [search])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/admin/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setSaving(false)
    if (res.ok) { toast.success("Employee added"); setShowAdd(false); fetchEmployees() }
    else { const d = await res.json(); toast.error(d.error || "Failed") }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const res = await fetch("/api/admin/employees", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) })
    setSaving(false)
    if (res.ok) { toast.success("Employee updated"); setShowEdit(false); fetchEmployees() }
    else toast.error("Failed to update employee")
  }

  const roleColor: Record<string, string> = { SUPER_ADMIN: "default", ADMIN: "default", SCHEDULER: "secondary", OPERATIONS: "secondary" }

  return (
    <DashboardLayout title="Employees">
      <div className="space-y-6">
        <div className="flex gap-3 justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
            <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 w-64" />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 border rounded-lg p-0.5">
              <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
            </div>
            <Button onClick={() => { setForm({ name: "", email: "", phone: "", role: "ADMIN", password: "" }); setShowAdd(true) }}><Plus className="h-4 w-4" /> Add Employee</Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {employees.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No employees found</p>
            ) : employees.map(emp => (
              <Card key={emp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold">{emp.name?.charAt(0)}</div>
                      <div>
                        <button onClick={() => { setViewTarget(emp); setShowView(true) }} className="font-semibold text-sm hover:underline text-left">{emp.name}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{emp.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewTarget(emp); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({...emp}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(emp); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={roleColor[emp.role] as any || "secondary"}>{emp.role}</Badge>
                    <Badge variant={emp.status === 'ACTIVE' ? 'success' : 'destructive'}>{emp.status}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> {emp.phone || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Joined:</span> {formatDate(emp.createdAt)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center text-gray-500 py-8">No employees found</TableCell></TableRow>
                ) : employees.map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell><div className="flex items-center gap-2"><div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center text-sm font-semibold">{emp.name?.charAt(0)}</div><button onClick={() => { setViewTarget(emp); setShowView(true) }} className="font-medium text-sm hover:underline text-left">{emp.name}</button></div></TableCell>
                    <TableCell className="text-sm">{emp.email}</TableCell>
                    <TableCell className="text-sm">{emp.phone || 'N/A'}</TableCell>
                    <TableCell><Badge variant={roleColor[emp.role] as any || "secondary"}>{emp.role}</Badge></TableCell>
                    <TableCell><Badge variant={emp.status === 'ACTIVE' ? 'success' : 'destructive'}>{emp.status}</Badge></TableCell>
                    <TableCell className="text-sm text-gray-500 dark:text-gray-400">{formatDate(emp.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => { setViewTarget(emp); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({...emp}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(emp); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent><DialogHeader><DialogTitle>Add Employee</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Default: staff123" /></div>
            </div>
            <div className="space-y-1"><Label>Role *</Label>
              <Select value={form.role} onValueChange={v => setForm(p => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="SUPER_ADMIN">Super Admin</SelectItem><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SCHEDULER">Scheduler</SelectItem><SelectItem value="OPERATIONS">Operations Staff</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Employee"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent><DialogHeader><DialogTitle>Edit Employee</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name *</Label><Input value={editForm.name || ''} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Email *</Label><Input type="email" value={editForm.email || ''} onChange={e => setEditForm((p: any) => ({ ...p, email: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={editForm.phone || ''} onChange={e => setEditForm((p: any) => ({ ...p, phone: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Role *</Label>
                <Select value={editForm.role || 'ADMIN'} onValueChange={v => setEditForm((p: any) => ({ ...p, role: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ADMIN">Admin</SelectItem><SelectItem value="SCHEDULER">Scheduler</SelectItem><SelectItem value="OPERATIONS">Operations</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Status</Label>
                <Select value={editForm.status || 'ACTIVE'} onValueChange={v => setEditForm((p: any) => ({ ...p, status: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="ACTIVE">Active</SelectItem><SelectItem value="SUSPENDED">Suspended</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Employee</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => { try { await fetch('/api/admin/employees', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget?.id }) }); toast.success('Deleted'); setShowDelete(false); fetchEmployees() } catch { toast.error('Failed') } }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Employee Details</DialogTitle></DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-lg font-semibold">{viewTarget.name?.charAt(0)}</div>
                <div><p className="font-semibold text-lg">{viewTarget.name}</p><p className="text-sm text-gray-500 dark:text-gray-400">{viewTarget.email}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500 dark:text-gray-400 block">Phone</span><span className="font-medium">{viewTarget.phone || 'N/A'}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Role</span><Badge variant={roleColor[viewTarget.role] as any || "secondary"}>{viewTarget.role}</Badge></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Status</span><Badge variant={viewTarget.status === 'ACTIVE' ? 'success' : 'destructive'}>{viewTarget.status}</Badge></div>
                <div><span className="text-gray-500 dark:text-gray-400 block">Joined</span><span className="font-medium">{formatDate(viewTarget.createdAt)}</span></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
