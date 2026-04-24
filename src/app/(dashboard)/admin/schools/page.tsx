"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Loader2, School, Pencil, Trash2, Eye, LayoutGrid, LayoutList } from "lucide-react"
import toast from "react-hot-toast"

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", address: "", contactName: "", contactPhone: "", contactEmail: "", startTime: "", endTime: "" })
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [showDelete, setShowDelete] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any>(null)
  const [showView, setShowView] = useState(false)
  const [viewTarget, setViewTarget] = useState<any>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')

  const fetchSchools = () => {
    setLoading(true)
    fetch("/api/admin/schools").then(r => r.json()).then(d => { setSchools(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { fetchSchools() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success("School added"); setShowAdd(false); fetchSchools() }
    else toast.error("Failed to add school")
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/schools", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { toast.success("School updated"); setShowEdit(false); fetchSchools() }
    else toast.error("Failed to update school")
  }

  return (
    <DashboardLayout title="Schools">
      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          <div className="flex gap-1 border rounded-lg p-0.5">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutList className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('card')} className={`p-1.5 rounded ${viewMode === 'card' ? 'bg-black text-white' : 'text-gray-400'}`}><LayoutGrid className="h-4 w-4" /></button>
          </div>
          <Button onClick={() => { setForm({ name: "", address: "", contactName: "", contactPhone: "", contactEmail: "", startTime: "", endTime: "" }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Add School
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : viewMode === 'card' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {schools.length === 0 ? (
              <p className="text-center text-gray-500 py-8 col-span-full">No schools added</p>
            ) : schools.map(s => (
              <Card key={s.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                        <School className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <button onClick={() => { setViewTarget(s); setShowView(true) }} className="font-semibold text-sm hover:underline text-left">{s.name}</button>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.address}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setViewTarget(s); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditForm({...s}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(s); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500 dark:text-gray-400">Contact:</span> {s.contactName || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Phone:</span> {s.contactPhone || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Times:</span> {s.startTime || 'N/A'} \u2013 {s.endTime || 'N/A'}</div>
                    <div><span className="text-gray-500 dark:text-gray-400">Pupils:</span> {s._count?.pupils || 0}</div>
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
                    <TableHead>School</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Times</TableHead>
                    <TableHead>Pupils</TableHead>
                    <TableHead>Routes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-gray-500 py-8">No schools added</TableCell></TableRow>
                  ) : schools.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <School className="h-4 w-4 text-gray-600" />
                          </div>
                          <div>
                            <button onClick={() => { setViewTarget(s); setShowView(true) }} className="font-medium hover:underline text-left">{s.name}</button>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{s.address}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm">{s.contactName || 'N/A'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.contactEmail}</p>
                      </TableCell>
                      <TableCell className="text-sm">{s.startTime || 'N/A'} \u2013 {s.endTime || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{s._count?.pupils || 0}</TableCell>
                      <TableCell className="text-sm">{s._count?.schedules || 0}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setViewTarget(s); setShowView(true) }}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setEditForm({...s}); setShowEdit(true) }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDeleteTarget(s); setShowDelete(true) }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
          <DialogHeader><DialogTitle>Add School</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>School Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1 col-span-2"><Label>Address *</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Contact Name</Label><Input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Contact Phone</Label><Input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label>Contact Email</Label><Input type="email" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} /></div>
              <div className="space-y-1"><Label>School Start Time</Label><Input type="time" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} /></div>
              <div className="space-y-1"><Label>School End Time</Label><Input type="time" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add School"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Edit School</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>School Name *</Label><Input value={editForm.name || ''} onChange={e => setEditForm((p: any) => ({ ...p, name: e.target.value }))} required /></div>
              <div className="space-y-1 col-span-2"><Label>Address *</Label><Input value={editForm.address || ''} onChange={e => setEditForm((p: any) => ({ ...p, address: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>Contact Name</Label><Input value={editForm.contactName || ''} onChange={e => setEditForm((p: any) => ({ ...p, contactName: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Contact Phone</Label><Input value={editForm.contactPhone || ''} onChange={e => setEditForm((p: any) => ({ ...p, contactPhone: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label>Contact Email</Label><Input type="email" value={editForm.contactEmail || ''} onChange={e => setEditForm((p: any) => ({ ...p, contactEmail: e.target.value }))} /></div>
              <div className="space-y-1"><Label>School Start Time</Label><Input type="time" value={editForm.startTime || ''} onChange={e => setEditForm((p: any) => ({ ...p, startTime: e.target.value }))} /></div>
              <div className="space-y-1"><Label>School End Time</Label><Input type="time" value={editForm.endTime || ''} onChange={e => setEditForm((p: any) => ({ ...p, endTime: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {showDelete && deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl text-gray-900 dark:text-gray-100 max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">Confirm Delete</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Are you sure you want to delete <strong>{deleteTarget.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowDelete(false)}>Cancel</Button>
              <Button variant="destructive" onClick={async () => {
                try {
                  await fetch('/api/admin/schools', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: deleteTarget.id }) })
                  toast.success('Deleted successfully')
                  setShowDelete(false)
                  fetchSchools()
                } catch { toast.error('Failed to delete') }
              }}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {showView && viewTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowView(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl text-gray-900 dark:text-gray-100 max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">School Details</h3>
              <button onClick={() => setShowView(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500 dark:text-gray-400 block">Name</span><span className="font-medium">{viewTarget.name}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Address</span><span className="font-medium">{viewTarget.address}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Contact Name</span><span className="font-medium">{viewTarget.contactName || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Contact Phone</span><span className="font-medium">{viewTarget.contactPhone || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Contact Email</span><span className="font-medium">{viewTarget.contactEmail || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Start Time</span><span className="font-medium">{viewTarget.startTime || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">End Time</span><span className="font-medium">{viewTarget.endTime || 'N/A'}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Pupils</span><span className="font-medium">{viewTarget._count?.pupils || 0}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Routes</span><span className="font-medium">{viewTarget._count?.schedules || 0}</span></div>
              <div><span className="text-gray-500 dark:text-gray-400 block">Status</span><span className="font-medium">{viewTarget.status || 'N/A'}</span></div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
