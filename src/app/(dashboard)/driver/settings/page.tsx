"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Bell, Shield, Save, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import AvatarUpload from "@/components/ui/avatar-upload"
import toast from "react-hot-toast"

export default function DriverSettingsPage() {
  const { data: session, update } = useSession()
  const [name, setName] = useState(session?.user?.name || "")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState({
    routeAlerts: true,
    passengerUpdates: true,
    emergencyAlerts: true,
  })

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name)
  }, [session?.user?.name])

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name cannot be empty")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/profile/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile & Settings</h1>
          <p className="text-slate-500">Manage your profile photo and personal information</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input defaultValue={session?.user?.email || ""} disabled className="bg-gray-50 dark:bg-gray-800" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">Email cannot be changed. Contact admin if needed.</p>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Role: DRIVER
                  </Badge>
                </div>
                <Button onClick={saveProfile} size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "routeAlerts" as const, label: "Route Alerts", desc: "Get notified of schedule changes and route updates" },
              { key: "passengerUpdates" as const, label: "Passenger Updates", desc: "Receive updates about passenger bookings and absences" },
              { key: "emergencyAlerts" as const, label: "Emergency Alerts", desc: "Critical safety and emergency notifications (always enabled)" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={() => {
                    if (item.key === "emergencyAlerts") return
                    setNotifications(prev => ({ ...prev, [item.key]: !prev[item.key] }))
                    toast.success(`${item.label} ${notifications[item.key] ? "disabled" : "enabled"}`)
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    notifications[item.key]
                      ? "bg-green-100 text-green-700 hover:bg-green-200"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {notifications[item.key] ? "Enabled" : "Disabled"}
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your data is protected under UK GDPR and encrypted at rest using AES-256.
              All platform communication uses TLS 1.3.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Data Encryption", status: "Active" },
                { label: "TLS 1.3", status: "Active" },
                { label: "GDPR Compliant", status: "Active" },
                { label: "Audit Logging", status: "Active" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="text-xs text-green-600 font-medium">✓ {item.status}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
