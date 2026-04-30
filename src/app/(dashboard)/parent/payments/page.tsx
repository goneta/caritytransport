
"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Loader2, RefreshCw, CalendarClock } from "lucide-react"
import toast from "react-hot-toast"

export default function ParentPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [plans, setPlans] = useState<any[]>([])

  const load = () => {
    setLoading(true)
    fetch('/api/parent/payment-methods')
      .then((r) => r.json())
      .then((data) => {
        setPaymentMethods(Array.isArray(data.paymentMethods) ? data.paymentMethods : [])
        setPlans(Array.isArray(data.recurringPlans) ? data.recurringPlans : [])
      })
      .catch(() => toast.error('Failed to load payment settings'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const setupPaymentMethod = async () => {
    setSaving(true)
    const res = await fetch('/api/parent/payment-methods', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (res.ok && data.url) window.location.href = data.url
    else toast.error(data.error || 'Unable to start payment method setup')
  }

  const updatePlan = async (id: string, status: string) => {
    const res = await fetch('/api/parent/recurring-plans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) { toast.success('Renewal plan updated'); load() }
    else toast.error('Failed to update renewal plan')
  }

  return (
    <DashboardLayout title="Payments & Renewals">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage saved cards and automatic renewal for recurring transport plans.</p>
          </div>
          <Button onClick={setupPaymentMethod} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Add saved card
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Saved payment methods</CardTitle></CardHeader>
              <CardContent>
                {paymentMethods.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-lg text-center text-sm text-gray-500">
                    No saved payment methods yet. Add a card to enable automatic recurring transport renewals.
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="p-4 rounded-lg border flex items-center justify-between">
                        <div>
                          <p className="font-semibold capitalize">{method.brand || 'Card'} ending {method.last4 || '••••'}</p>
                          <p className="text-sm text-gray-500">Expires {method.expiryMonth || '--'}/{method.expiryYear || '--'}</p>
                        </div>
                        {method.isDefault && <Badge>Default</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Automatic renewal plans</CardTitle></CardHeader>
              <CardContent>
                {plans.length === 0 ? (
                  <div className="p-6 border border-dashed rounded-lg text-center text-sm text-gray-500">
                    No automatic renewal plans yet. Use the renewal option from checkout or create one from your route assignment when available.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div key={plan.id} className="p-4 rounded-lg border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold">{plan.pupil?.fullName || 'Transport plan'} · {plan.schedule?.routeName || 'Route pending'}</p>
                          <p className="text-sm text-gray-500">{plan.schedule?.school?.name || 'School'} · £{Number(plan.amount || 0).toFixed(2)} {plan.renewalInterval?.toLowerCase()}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><CalendarClock className="h-3 w-3" /> Next renewal: {plan.nextRenewalDate ? new Date(plan.nextRenewalDate).toLocaleDateString('en-GB') : 'Not scheduled'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={plan.status === 'ACTIVE' ? 'success' : plan.status === 'PAUSED' ? 'warning' : 'secondary'}>{plan.status}</Badge>
                          {plan.status === 'ACTIVE' ? (
                            <Button variant="secondary" size="sm" onClick={() => updatePlan(plan.id, 'PAUSED')}>Pause</Button>
                          ) : plan.status === 'PAUSED' ? (
                            <Button variant="secondary" size="sm" onClick={() => updatePlan(plan.id, 'ACTIVE')}>Resume</Button>
                          ) : null}
                          {plan.status !== 'CANCELLED' && <Button variant="destructive" size="sm" onClick={() => updatePlan(plan.id, 'CANCELLED')}>Cancel</Button>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
