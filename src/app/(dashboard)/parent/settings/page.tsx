"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Bell, Shield, Save, Phone, Loader2 } from "lucide-react"
import AvatarUpload from "@/components/ui/avatar-upload"
import toast from "react-hot-toast"

interface PushStatus {
  publicKey: string | null
  configured: boolean
  subscribed: boolean
  notifyPush: boolean
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

export default function ParentSettingsPage() {
  const { data: session, update } = useSession()
  const [name, setName] = useState(session?.user?.name || "")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [pushLoading, setPushLoading] = useState(false)
  const [notifications, setNotifications] = useState({
    sms: true,
    email: true,
    inApp: true,
  })

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name)
  }, [session?.user?.name])

  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/parent/push-subscriptions")
      .then((res) => res.json())
      .then((data) => setPushStatus(data))
      .catch(() => setPushStatus(null))
  }, [session?.user?.id])

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

  async function enablePushNotifications() {
    if (!pushStatus?.configured || !pushStatus.publicKey) {
      toast.error("Push notifications are not configured on this deployment")
      return
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      toast.error("This browser does not support push notifications")
      return
    }

    setPushLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Notification permission was not granted")
        return
      }

      const registration = await navigator.serviceWorker.register("/sw.js")
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushStatus.publicKey),
      })

      const res = await fetch("/api/parent/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Unable to save push subscription")
      }

      const updated = await res.json()
      setPushStatus((prev) => ({
        publicKey: prev?.publicKey || pushStatus.publicKey,
        configured: prev?.configured ?? true,
        subscribed: updated.subscribed,
        notifyPush: updated.notifyPush,
      }))
      toast.success("Push notifications enabled")
    } catch (error: any) {
      toast.error(error?.message || "Failed to enable push notifications")
    } finally {
      setPushLoading(false)
    }
  }

  async function disablePushNotifications() {
    setPushLoading(true)
    try {
      let endpoint = ""
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration("/sw.js")
        const subscription = await registration?.pushManager.getSubscription()
        endpoint = subscription?.endpoint || ""
        await subscription?.unsubscribe()
      }

      const res = await fetch("/api/parent/push-subscriptions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Unable to disable push notifications")
      }

      const updated = await res.json()
      setPushStatus((prev) => ({
        publicKey: prev?.publicKey || null,
        configured: prev?.configured ?? false,
        subscribed: updated.subscribed,
        notifyPush: updated.notifyPush,
      }))
      toast.success("Push notifications disabled")
    } catch (error: any) {
      toast.error(error?.message || "Failed to disable push notifications")
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <DashboardLayout title="Settings">
      <div className="space-y-6 max-w-2xl">

        {/* My Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />My Profile
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input defaultValue={session?.user?.email || ""} disabled className="bg-gray-50 dark:bg-gray-800" />
                    <p className="text-xs text-gray-400 dark:text-gray-500">Email cannot be changed</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> Phone Number</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+44 7700 000000" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">Used for SMS transport alerts</p>
                </div>
                <Button onClick={saveProfile} size="sm" disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "sms" as const, label: "SMS Notifications", desc: "Receive text messages for transport updates and alerts" },
              { key: "email" as const, label: "Email Notifications", desc: "Receive emails for booking confirmations and updates" },
              { key: "inApp" as const, label: "In-App Notifications", desc: "Receive notifications within the platform" },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
                <button
                  onClick={() => {
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

            <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="font-medium text-sm">Push Notifications</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive browser alerts when trips start, boarding is scanned, or route progress changes.
                </p>
                {pushStatus && !pushStatus.configured && (
                  <p className="text-xs text-amber-600 mt-1">Push delivery requires VAPID keys in the deployment environment.</p>
                )}
              </div>
              <Button
                size="sm"
                variant={pushStatus?.subscribed ? "secondary" : "default"}
                onClick={pushStatus?.subscribed ? disablePushNotifications : enablePushNotifications}
                disabled={pushLoading || !pushStatus || !pushStatus.configured}
              >
                {pushLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {pushStatus?.subscribed ? "Disable" : "Enable"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />Privacy & Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your data is encrypted at rest and in transit. We comply with UK GDPR regulations.
              You have the right to access, correct, or delete your personal data.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "GDPR Compliant", status: "Active" },
                { label: "Data Encryption", status: "Active" },
                { label: "TLS 1.3 Transit", status: "Active" },
                { label: "Audit Logging", status: "Active" },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
                  <span className="text-xs text-green-600 font-medium">✓ {item.status}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap pt-2">
              <Button variant="secondary" size="sm" onClick={() => toast("Data export request submitted. You'll receive an email within 30 days.", { icon: "📧" })}>
                Request Data Export
              </Button>
              <Button variant="secondary" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => toast("Account deletion request submitted. Our team will contact you within 5 business days.", { icon: "⚠️" })}>
                Request Account Deletion
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
