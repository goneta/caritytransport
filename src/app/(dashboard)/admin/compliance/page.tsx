"use client"

import { useEffect, useMemo, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, BadgeCheck, CalendarClock, Car, FileCheck2, Loader2, ShieldAlert, UserCheck } from "lucide-react"

type ComplianceStatus = "EXPIRED" | "EXPIRING_SOON" | "CURRENT" | "MISSING"

type ComplianceItem = {
  id: string
  category: "LICENCE" | "TRAINING" | "VEHICLE_INSPECTION" | "VEHICLE_INSURANCE" | "COMPANY_INSURANCE"
  ownerType: "DRIVER" | "VEHICLE" | "COMPANY"
  ownerId: string
  ownerName: string
  detail: string
  expiryDate: string | null
  daysUntilExpiry: number | null
  status: ComplianceStatus
}

type ComplianceData = {
  warningDays: number
  summary: Record<ComplianceStatus | "total", number>
  byCategory: Record<string, { total: number; alerts: number }>
  alerts: ComplianceItem[]
  items: ComplianceItem[]
}

const categoryLabel: Record<ComplianceItem["category"], string> = {
  LICENCE: "Driver licence",
  TRAINING: "Training record",
  VEHICLE_INSPECTION: "Vehicle inspection",
  VEHICLE_INSURANCE: "Vehicle insurance",
  COMPANY_INSURANCE: "Company insurance",
}

const statusTone: Record<ComplianceStatus, { label: string; className: string }> = {
  EXPIRED: { label: "Expired", className: "bg-red-100 text-red-800 border-red-200" },
  EXPIRING_SOON: { label: "Expiring soon", className: "bg-amber-100 text-amber-800 border-amber-200" },
  MISSING: { label: "Missing", className: "bg-slate-100 text-slate-800 border-slate-200" },
  CURRENT: { label: "Current", className: "bg-green-100 text-green-800 border-green-200" },
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function expiryText(item: ComplianceItem) {
  if (item.daysUntilExpiry === null) return "No expiry date recorded"
  if (item.daysUntilExpiry < 0) return `${Math.abs(item.daysUntilExpiry)} days overdue`
  if (item.daysUntilExpiry === 0) return "Expires today"
  return `${item.daysUntilExpiry} days remaining`
}

export default function AdminCompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>("ALL")

  useEffect(() => {
    fetch("/api/admin/compliance")
      .then(response => response.json())
      .then(payload => setData(payload))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const filteredItems = useMemo(() => {
    const items = data?.items ?? []
    if (category === "ALL") return items
    if (category === "ALERTS") return items.filter(item => item.status !== "CURRENT")
    return items.filter(item => item.category === category)
  }, [data?.items, category])

  if (loading) {
    return (
      <DashboardLayout title="Compliance">
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Compliance">
      <div className="space-y-6">
        <div className="rounded-xl bg-black p-6 text-white">
          <p className="text-sm uppercase tracking-wide text-gray-400">Driver and fleet compliance</p>
          <h2 className="mt-1 text-2xl font-bold">Automatic expiry alerts</h2>
          <p className="mt-2 max-w-3xl text-sm text-gray-300">
            This panel monitors licence expiry, driver training records, vehicle inspection dates, insurance dates, and company insurance. Items due within {data?.warningDays ?? 45} days are flagged automatically.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase text-gray-500">Expired</p><p className="text-3xl font-bold text-red-700">{data?.summary?.EXPIRED ?? 0}</p></div><ShieldAlert className="h-8 w-8 text-red-300" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase text-gray-500">Expiring soon</p><p className="text-3xl font-bold text-amber-700">{data?.summary?.EXPIRING_SOON ?? 0}</p></div><CalendarClock className="h-8 w-8 text-amber-300" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase text-gray-500">Missing dates</p><p className="text-3xl font-bold text-slate-700">{data?.summary?.MISSING ?? 0}</p></div><AlertTriangle className="h-8 w-8 text-slate-300" /></CardContent></Card>
          <Card><CardContent className="flex items-center justify-between p-5"><div><p className="text-xs uppercase text-gray-500">Current</p><p className="text-3xl font-bold text-green-700">{data?.summary?.CURRENT ?? 0}</p></div><BadgeCheck className="h-8 w-8 text-green-300" /></CardContent></Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck2 className="h-5 w-5" />Compliance categories</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[{ key: "ALL", label: "All records" }, { key: "ALERTS", label: "Needs attention" }, ...Object.entries(categoryLabel).map(([key, label]) => ({ key, label }))].map(option => {
                const categoryData = option.key in (data?.byCategory ?? {}) ? data?.byCategory?.[option.key] : null
                const active = category === option.key
                return (
                  <button
                    key={option.key}
                    onClick={() => setCategory(option.key)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${active ? "border-black bg-black text-white" : "border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800"}`}
                  >
                    <span>{option.label}</span>
                    <span className="text-xs opacity-75">{option.key === "ALL" ? data?.summary?.total ?? 0 : option.key === "ALERTS" ? data?.alerts?.length ?? 0 : `${categoryData?.alerts ?? 0}/${categoryData?.total ?? 0}`}</span>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />Compliance records</CardTitle></CardHeader>
            <CardContent>
              {filteredItems.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No compliance records match this filter.</div>
              ) : (
                <div className="space-y-3">
                  {filteredItems.map(item => (
                    <div key={item.id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">{item.ownerName}</p>
                            <Badge className={statusTone[item.status].className}>{statusTone[item.status].label}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{categoryLabel[item.category]} · {item.detail}</p>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span>Expiry: {formatDate(item.expiryDate)}</span>
                            <span>{expiryText(item)}</span>
                            <span>{item.ownerType.toLowerCase()}</span>
                          </div>
                        </div>
                        {item.ownerType === "VEHICLE" ? <Car className="h-5 w-5 text-gray-400" /> : <FileCheck2 className="h-5 w-5 text-gray-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
