"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Send, Loader2, Mail, MessageSquare, Smartphone } from "lucide-react"
import toast from "react-hot-toast"

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ subject: "", message: "", type: "IN_APP", recipientType: "ALL" })

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/notifications").then(r => r.json()),
      fetch("/api/admin/parents").then(r => r.json()),
    ]).then(([n, p]) => {
      setNotifications(Array.isArray(n) ? n : [])
      setParents(Array.isArray(p) ? p : [])
      setLoading(false)
    })
  }, [])

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    const recipientIds = parents.map((p: any) => p.id)
    const res = await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientIds, ...form }),
    })
    setSending(false)
    if (res.ok) { toast.success("Notification sent to all parents"); setShowBroadcast(false) }
    else toast.error("Failed to send notification")
  }

  const typeIcon: Record<string, any> = {
    SMS: <Smartphone className="h-4 w-4 text-blue-600" />,
    EMAIL: <Mail className="h-4 w-4 text-green-600" />,
    IN_APP: <Bell className="h-4 w-4 text-purple-600" />,
  }

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6">
        <div className="flex justify-end gap-2">
          <Button onClick={() => setShowBroadcast(true)}>
            <Send className="h-4 w-4" /> Send Broadcast
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Sent", value: notifications.length, icon: Bell },
            { label: "Unread", value: notifications.filter((n: any) => !n.read).length, icon: Bell },
            { label: "In-App", value: notifications.filter((n: any) => n.type === 'IN_APP').length, icon: MessageSquare },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </div>
                <s.icon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader><CardTitle>Notification Log</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-6">No notifications yet</p>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 30).map((n: any) => (
                  <div key={n.id} className="flex items-start gap-3 p-3 border border-gray-100 dark:border-gray-800 rounded-lg">
                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                      {typeIcon[n.type] || <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.subject && <p className="font-medium text-sm">{n.subject}</p>}
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(n.sentAt).toLocaleString('en-GB')}</p>
                    </div>
                    <Badge variant={n.read ? 'secondary' : 'default'}>{n.read ? 'Read' : 'Unread'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showBroadcast} onOpenChange={setShowBroadcast}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Broadcast Notification</DialogTitle></DialogHeader>
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN_APP">In-App</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Subject</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Notification subject" /></div>
            <div className="space-y-1">
              <Label>Message *</Label>
              <textarea
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-md p-3 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Your message to all parents..."
                required
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">This will send to all {parents.length} parent accounts.</p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowBroadcast(false)}>Cancel</Button>
              <Button type="submit" disabled={sending}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4" />Send to All</>}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
