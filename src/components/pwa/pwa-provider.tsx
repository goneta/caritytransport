"use client"

import { useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Bell, Download, Loader2, Smartphone, X } from "lucide-react"
import toast from "react-hot-toast"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

interface PushStatus {
  publicKey: string | null
  configured: boolean
  subscribed: boolean
  notifyPush: boolean
  role?: string
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

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false
  return window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone === true
}

export default function PwaProvider() {
  const { status } = useSession()
  const pathname = usePathname()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [registered, setRegistered] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null)
  const [pushLoading, setPushLoading] = useState(false)

  useEffect(() => {
    setStandalone(isStandaloneDisplay())
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .register("/sw.js")
      .then(() => setRegistered(true))
      .catch((error) => {
        console.warn("PWA service worker registration failed:", error)
        setRegistered(false)
      })
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    if (status !== "authenticated") {
      setPushStatus(null)
      return
    }

    fetch("/api/push-subscriptions")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setPushStatus(data))
      .catch(() => setPushStatus(null))
  }, [status])

  const isAuthRoute = useMemo(() => pathname?.startsWith("/login") || pathname?.startsWith("/register"), [pathname])
  const canShowBanner = !dismissed && !isAuthRoute && (Boolean(installPrompt) || (status === "authenticated" && pushStatus?.configured && !pushStatus.subscribed))

  async function handleInstall() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === "accepted") {
        toast.success("Carity Transport installed")
        setInstallPrompt(null)
        setStandalone(true)
      }
    } catch (error: any) {
      toast.error(error?.message || "Unable to install the app")
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

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushStatus.publicKey),
      })

      const res = await fetch("/api/push-subscriptions", {
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
        role: prev?.role,
        subscribed: updated.subscribed,
        notifyPush: updated.notifyPush,
      }))
      toast.success("Mobile push notifications enabled")
    } catch (error: any) {
      toast.error(error?.message || "Failed to enable push notifications")
    } finally {
      setPushLoading(false)
    }
  }

  if (!canShowBanner) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl border border-white/20 bg-gray-950/95 p-4 text-white shadow-2xl backdrop-blur sm:left-auto sm:right-4 sm:mx-0">
      <button
        type="button"
        className="absolute right-3 top-3 rounded-full p-1 text-gray-300 transition hover:bg-white/10 hover:text-white"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss mobile app prompt"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold">Use Carity like a mobile app</p>
            <p className="text-xs leading-5 text-gray-300">
              Install the secure PWA for quick access and enable mobile push alerts for transport updates.
              {!registered && " Service-worker support is unavailable in this browser."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {installPrompt && !standalone && (
              <Button size="sm" className="bg-white text-gray-950 hover:bg-gray-100" onClick={handleInstall}>
                <Download className="mr-1 h-4 w-4" /> Install app
              </Button>
            )}
            {status === "authenticated" && pushStatus?.configured && !pushStatus.subscribed && (
              <Button size="sm" variant="secondary" onClick={enablePushNotifications} disabled={pushLoading}>
                {pushLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Bell className="mr-1 h-4 w-4" />}
                Enable push
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
