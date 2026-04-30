'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Policy = { requireAdminTwoFactor: boolean; requireDriverTwoFactor: boolean }

export default function SecurityPolicySettings() {
  const [policy, setPolicy] = useState<Policy | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/security-policy').then(r => r.ok ? r.json() : null).then(d => d && setPolicy(d)).catch(() => {})
  }, [])

  async function savePolicy() {
    if (!policy) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/security-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save policy')
      setPolicy(data)
      toast.success('Security policy updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  if (!policy) return null

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Two-Factor Policy</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">Keep 2FA optional while rolling it out, or require enrollment for operational roles once devices and recovery codes have been issued.</p>
        {[
          { key: 'requireAdminTwoFactor' as const, label: 'Require for admin, scheduler and operations accounts' },
          { key: 'requireDriverTwoFactor' as const, label: 'Require for driver accounts' },
        ].map(item => (
          <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-gray-800 p-3">
            <div>
              <p className="font-medium text-sm">{item.label}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Users without enrollment are prompted from their settings page until enabled.</p>
            </div>
            <button
              type="button"
              onClick={() => setPolicy(prev => prev ? { ...prev, [item.key]: !prev[item.key] } : prev)}
              className={`px-3 py-1 rounded-full text-xs font-medium ${policy[item.key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}
            >
              {policy[item.key] ? 'Required' : 'Optional'}
            </button>
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Badge variant="secondary">Audit logged</Badge>
          <Button onClick={savePolicy} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? 'Saving…' : 'Save Policy'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}
