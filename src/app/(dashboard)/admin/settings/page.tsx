"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Settings, Bell, Shield, Mail, Smartphone, Save, User, CheckCircle, AlertCircle } from "lucide-react"
import AvatarUpload from "@/components/ui/avatar-upload"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const role = (session?.user as any)?.role
  const [name, setName] = useState(session?.user?.name || "")
  const [saving, setSaving] = useState(false)
  const [channelStatus, setChannelStatus] = useState<{ twilio: boolean; sendgrid: boolean; inApp: boolean } | null>(null)

  useEffect(() => {
    fetch('/api/admin/notification-status')
      .then(r => r.json())
      .then(d => setChannelStatus(d))
      .catch(() => {})
  }, [])

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name cannot be empty")
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (res.ok) {
        await update({ name: name.trim() })
        toast.success("Profile updated successfully")
      } else {
        const d = await res.json()
        toast.error(d.error || "Failed to update profile")
      }
    } catch {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-3xl">

        {/* My Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <AvatarUpload
                currentImage={(session?.user as any)?.image}
                name={session?.user?.name}
                size="lg"
                onSuccess={async (img) => {
                  await update({ image: img })
                  toast.success(img ? "Profile photo updated!" : "Profile photo removed.")
                }}
              />
              <div className="flex-1 space-y-3 w-full">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input defaultValue={session?.user?.email || ""} disabled className="bg-gray-50 dark:bg-gray-800" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
                    <div className="mt-0.5"><Badge variant="default">{role}</Badge></div>
                  </div>
                  <Button onClick={saveProfile} size="sm" disabled={saving}>
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? "Saving\u2026" : "Save Changes"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Settings */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Platform Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-medium">Require Admin Approval for New Parents</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">New parent registrations require admin approval before access</span>
              </div>
              <Badge variant="success">Enabled</Badge>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div>
                <span className="font-medium">Session Timeout</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Auto-logout after inactivity</span>
              </div>
              <span className="text-sm font-medium">30 minutes</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <span className="font-medium">Audit Logging</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">Record all create/edit/delete actions</span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notification Channels */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />Notification Channels</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <span className="font-medium">SMS (Twilio)</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    SMS notifications via Twilio API
                  </span>
                  {channelStatus && !channelStatus.twilio && (
                    <span className="block text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to .env.local
                    </span>
                  )}
                </div>
              </div>
              {channelStatus?.twilio
                ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Connected</Badge>
                : <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1 inline" />Not Configured</Badge>
              }
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-green-600" />
                <div>
                  <span className="font-medium">Email (SendGrid)</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    Email notifications via SendGrid
                  </span>
                  {channelStatus && !channelStatus.sendgrid && (
                    <span className="block text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Add SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to .env.local
                    </span>
                  )}
                </div>
              </div>
              {channelStatus?.sendgrid
                ? <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Connected</Badge>
                : <Badge variant="warning"><AlertCircle className="h-3 w-3 mr-1 inline" />Not Configured</Badge>
              }
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-purple-600" />
                <div>
                  <span className="font-medium">In-App Notifications</span>
                  <span className="block text-sm text-gray-500 dark:text-gray-400">Notifications visible in dashboard</span>
                </div>
              </div>
              <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1 inline" />Active</Badge>
            </div>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-100 dark:border-blue-800 rounded-lg">
              <span className="text-sm font-medium text-blue-800 dark:text-blue-200">How notifications work</span>
              <span className="block text-xs text-blue-700 dark:text-blue-300 mt-1">
                When a notification is triggered (e.g. route change, absence report), the system checks each
                recipient&apos;s preferences. If SMS is enabled and Twilio is configured, an SMS is sent. If email
                is enabled and SendGrid is configured, an email is sent. In-app notifications are always created.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Security &amp; Compliance</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Data Encryption at Rest", status: "Active" },
              { label: "TLS 1.3 In Transit", status: "Active" },
              { label: "GDPR Compliant", status: "Active" },
              { label: "WCAG 2.1 AA Accessibility", status: "Active" },
              { label: "99.5% Uptime SLA Target", status: "Active" },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                <span className="text-sm">{item.label}</span>
                <Badge variant="success">{item.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
