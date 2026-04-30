'use client'

import { useEffect, useState } from 'react'
import { Shield, KeyRound, QrCode, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

type TwoFactorStatus = {
  eligible: boolean
  enabled: boolean
  enrolledAt: string | null
  lastUsedAt: string | null
  recoveryCodesRemaining: number
  policy: { requireAdminTwoFactor: boolean; requireDriverTwoFactor: boolean; requiredForCurrentUser: boolean }
}

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null)
  const [code, setCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])

  useEffect(() => { void loadStatus() }, [])

  async function loadStatus() {
    const res = await fetch('/api/security/2fa/status')
    if (res.ok) setStatus(await res.json())
  }

  async function startEnrollment() {
    setLoading(true)
    setRecoveryCodes([])
    try {
      const res = await fetch('/api/security/2fa/enroll', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to start enrollment')
      setSetup({ secret: data.secret, qrDataUrl: data.qrDataUrl })
      toast.success('Scan the QR code, then enter your authenticator code')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start enrollment')
    } finally {
      setLoading(false)
    }
  }

  async function verifyEnrollment() {
    setLoading(true)
    try {
      const res = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid authenticator code')
      setRecoveryCodes(data.recoveryCodes || [])
      setSetup(null)
      setCode('')
      await loadStatus()
      toast.success('Two-factor authentication enabled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify code')
    } finally {
      setLoading(false)
    }
  }

  async function disableTwoFactor() {
    setLoading(true)
    try {
      const res = await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to disable 2FA')
      setDisableCode('')
      setRecoveryCodes([])
      await loadStatus()
      toast.success('Two-factor authentication disabled')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  if (!status) return null
  if (!status.eligible) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Two-Factor Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">Authenticator app protection</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Use a six-digit TOTP code at sign-in. Recovery codes can be used if the authenticator device is unavailable.</p>
            {status.policy.requiredForCurrentUser && !status.enabled && (
              <p className="mt-2 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> Platform policy requires this role to enroll.</p>
            )}
          </div>
          <Badge variant={status.enabled ? 'success' : status.policy.requiredForCurrentUser ? 'warning' : 'secondary'}>{status.enabled ? 'Enabled' : status.policy.requiredForCurrentUser ? 'Required' : 'Optional'}</Badge>
        </div>

        {status.enabled && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-100 dark:border-green-800 p-3 text-sm text-green-800 dark:text-green-200">
            <div className="flex items-center gap-2 font-medium"><CheckCircle className="h-4 w-4" /> 2FA is active</div>
            <p className="mt-1">Recovery codes remaining: {status.recoveryCodesRemaining}. Last used: {status.lastUsedAt ? new Date(status.lastUsedAt).toLocaleString('en-GB') : 'Not yet used'}.</p>
          </div>
        )}

        {!status.enabled && !setup && (
          <Button onClick={startEnrollment} disabled={loading}><QrCode className="h-4 w-4 mr-2" /> Start Enrollment</Button>
        )}

        {setup && (
          <div className="space-y-4 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <img src={setup.qrDataUrl} alt="Authenticator QR code" className="h-44 w-44 rounded-lg border bg-white p-2" />
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Manual setup secret</Label>
                  <Input value={setup.secret} readOnly className="font-mono text-xs" />
                </div>
                <div>
                  <Label>Six-digit code</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" inputMode="numeric" className="font-mono" />
                </div>
                <Button onClick={verifyEnrollment} disabled={loading || code.trim().length < 6}><KeyRound className="h-4 w-4 mr-2" /> Verify and Enable</Button>
              </div>
            </div>
          </div>
        )}

        {recoveryCodes.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4">
            <p className="font-medium text-amber-900 dark:text-amber-100">Save these recovery codes now. They will not be shown again.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recoveryCodes.map(codeValue => <code key={codeValue} className="rounded bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono">{codeValue}</code>)}
            </div>
          </div>
        )}

        {status.enabled && (
          <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
            <Label>Disable with authenticator or recovery code</Label>
            <div className="flex gap-2">
              <Input value={disableCode} onChange={e => setDisableCode(e.target.value)} placeholder="Code" className="font-mono" />
              <Button onClick={disableTwoFactor} disabled={loading || !disableCode.trim()} variant="destructive">Disable</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
