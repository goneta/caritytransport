"use client"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Save, Shield, QrCode } from "lucide-react"
import AvatarUpload from "@/components/ui/avatar-upload"
import toast from "react-hot-toast"

export default function PupilSettingsPage() {
  const { data: session, update } = useSession()
  const [name, setName] = useState(session?.user?.name || "")
  const [saving, setSaving] = useState(false)

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
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500">Update your profile photo and personal details</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <AvatarUpload
              currentImage={(session?.user as any)?.image}
              name={session?.user?.name}
              size="lg"
              onSuccess={async (img) => {
                await update({ image: img })
                toast.success(img ? "Profile photo updated!" : "Profile photo removed.")
              }}
            />
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input defaultValue={session?.user?.email || ""} disabled className="bg-gray-50 dark:bg-gray-800" />
              <p className="text-xs text-gray-400 dark:text-gray-500">Managed by your parent or guardian</p>
            </div>
            <Button onClick={saveProfile} size="sm" disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" /> My QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your QR code is used by drivers to verify your boarding. View it on the Dashboard.
          </p>
          <Button variant="secondary" size="sm" onClick={() => window.location.href = '/pupil'}>
            <QrCode className="h-4 w-4 mr-1" /> View My QR Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" /> Privacy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Your data is managed by your parent or guardian and the school. Contact them for any data-related requests.
            All data is encrypted and GDPR compliant.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
