"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCode, Download, Loader2 } from "lucide-react"

interface UserQRCardProps {
  userId: string
  userName: string
  type?: "user" | "pupil"
  targetId?: string
}

export default function UserQRCard({ userId, userName, type = "user", targetId }: UserQRCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("")
  const [identityCode, setIdentityCode] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!userId) return
    const id = targetId || userId
    fetch(`/api/qr/generate?userId=${id}&type=${type}`)
      .then(r => r.json())
      .then(d => {
        if (d.qrDataUrl) {
          setQrDataUrl(d.qrDataUrl)
          setIdentityCode(d.identityCode || "")
        } else {
          setError(true)
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [userId, type, targetId])

  function downloadQR() {
    if (!qrDataUrl) return
    const a = document.createElement("a")
    a.href = qrDataUrl
    a.download = `carity-qr-${userName?.replace(/\s+/g, "-") || "user"}.png`
    a.click()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-blue-500" />
          My Identity QR Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {loading ? (
          <div className="py-8 flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Generating QR code...</p>
          </div>
        ) : error || !qrDataUrl ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <QrCode className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm">QR code unavailable</p>
          </div>
        ) : (
          <>
            <div className="p-4 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
              <img src={qrDataUrl} alt="Identity QR Code" className="w-48 h-48" />
            </div>
            <div className="mt-3 text-center">
              <p className="font-semibold text-gray-900 dark:text-white">{userName}</p>
              {identityCode && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Manual identity code</p>
                  <p className="font-mono text-sm tracking-[0.18em] text-gray-900 dark:text-white">{identityCode}</p>
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={downloadQR}>
              <Download className="w-4 h-4 mr-2" /> Download QR
            </Button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
              Your unique identity QR code and fallback manual verification code
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
