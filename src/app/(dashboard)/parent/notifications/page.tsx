"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Mail, Smartphone, Loader2, CheckCheck } from "lucide-react"
import toast from "react-hot-toast"

export default function ParentNotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = () => {
    if (!session?.user?.id) return
    setLoading(true)
    fetch(`/api/parent/notifications?userId=${session.user.id}`)
      .then(r => r.json())
      .then(d => { setNotifications(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchNotifications() }, [session?.user?.id])

  const markRead = async (id: string) => {
    await fetch("/api/parent/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    fetchNotifications()
  }

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n =>
      fetch("/api/parent/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      })
    ))
    toast.success("All notifications marked as read")
    fetchNotifications()
  }

  const typeIcon: Record<string, any> = {
    SMS: <Smartphone className="h-4 w-4 text-blue-600" />,
    EMAIL: <Mail className="h-4 w-4 text-green-600" />,
    IN_APP: <Bell className="h-4 w-4 text-purple-600" />,
    PUSH: <Bell className="h-4 w-4 text-amber-600" />,
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />Mark All Read
            </Button>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />All Notifications
            {unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}
          </CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : notifications.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No notifications yet</p>
            ) : (
              <div className="space-y-3">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.read && markRead(n.id)}
                    className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                      !n.read ? 'bg-gray-50 border-gray-200 dark:border-gray-700 hover:bg-gray-100' : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="w-9 h-9 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                      {typeIcon[n.type] || <Bell className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.subject && <p className={`text-sm font-medium ${!n.read ? 'text-black' : 'text-gray-700'}`}>{n.subject}</p>}
                      <p className={`text-sm mt-0.5 ${!n.read ? 'text-gray-800' : 'text-gray-500'}`}>{n.message}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(n.sentAt).toLocaleString('en-GB')}</p>
                        <Badge variant="secondary" className="text-xs">{n.type}</Badge>
                      </div>
                    </div>
                    {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-black flex-shrink-0 mt-1" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
