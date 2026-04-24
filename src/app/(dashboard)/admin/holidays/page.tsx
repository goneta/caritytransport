"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Loader2, CalendarDays, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { formatDate } from "@/lib/utils"

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" })

  const fetchHolidays = () => {
    setLoading(true)
    fetch("/api/admin/holidays").then(r => r.json()).then(d => { setHolidays(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { fetchHolidays() }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await fetch("/api/admin/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { toast.success("Holiday period added"); setShowAdd(false); fetchHolidays() }
    else toast.error("Failed to add holiday period")
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this holiday period?")) return
    const res = await fetch("/api/admin/holidays", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success("Deleted"); fetchHolidays() }
    else toast.error("Failed to delete")
  }

  const isCurrentHoliday = (holiday: any) => {
    const today = new Date()
    return new Date(holiday.startDate) <= today && new Date(holiday.endDate) >= today
  }

  return (
    <DashboardLayout title="Holiday Manager">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage school holiday periods. Routes are automatically suspended during holidays.</p>
          <Button onClick={() => { setForm({ name: "", startDate: "", endDate: "" }); setShowAdd(true) }}>
            <Plus className="h-4 w-4" /> Add Holiday Period
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5" />Holiday Periods</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : holidays.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No holiday periods added yet</p>
            ) : (
              <div className="space-y-3">
                {holidays.map(h => (
                  <div key={h.id} className={`flex items-center justify-between p-4 rounded-lg border ${isCurrentHoliday(h) ? 'bg-green-50 border-green-200' : 'bg-white dark:bg-gray-900 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-black text-white rounded-lg flex items-center justify-center">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{h.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(h.startDate)} → {formatDate(h.endDate)}
                        </p>
                        {isCurrentHoliday(h) && (
                          <p className="text-xs text-green-700 font-medium mt-0.5">🟢 Currently Active</p>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(h.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-50 border-gray-200 dark:border-gray-700">
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Note:</strong> When a holiday period is active, no new routes will be auto-created for those dates.
              Existing routes will be flagged. Notify parents of holiday periods using the Notifications module.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Holiday Period</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1"><Label>Holiday Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Summer Holidays 2025" required /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required /></div>
              <div className="space-y-1"><Label>End Date *</Label><Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} required /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Period"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
