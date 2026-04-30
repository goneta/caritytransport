"use client"

import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts"
import { BarChart3, TrendingUp, Users, Bus, Route, CreditCard, PoundSterling, Percent, RotateCcw } from "lucide-react"
import { Loader2 } from "lucide-react"

const COLORS = ['#000', '#333', '#555', '#777', '#999', '#bbb']

type FinanceSegment = {
  key: string
  label: string
  revenue: number
  refunds: number
  net: number
  bookings: number
  refundedBookings: number
}

type FinanceDashboard = {
  summary: {
    totalRevenue: number
    totalRefunds: number
    netRevenue: number
    paidBookings: number
    refundedBookings: number
    averageBookingValue: number
  }
  segments: {
    bySchool: FinanceSegment[]
    byRoute: FinanceSegment[]
    byDate: FinanceSegment[]
    byPaymentMethod: FinanceSegment[]
  }
}

const money = (value: number) => `£${(value || 0).toFixed(2)}`

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard").then(r => r.json()),
      fetch("/api/admin/schedules").then(r => r.json()),
      fetch("/api/admin/drivers").then(r => r.json()),
      fetch("/api/admin/vehicles").then(r => r.json()),
      fetch("/api/admin/bookings").then(r => r.json()),
      fetch("/api/admin/finance-dashboard").then(r => r.json()),
    ]).then(([dash, schedules, drivers, vehicles, bookings, finance]) => {
      const schedArr = Array.isArray(schedules) ? schedules : []
      const driversArr = Array.isArray(drivers) ? drivers : []
      const vehiclesArr = Array.isArray(vehicles) ? vehicles : []
      const bookingsArr = Array.isArray(bookings) ? bookings : []
      const financeData: FinanceDashboard | null = finance?.summary ? finance : null

      // Route utilisation
      const routeUtilData = schedArr.slice(0, 8).map((s: any) => ({
        name: s.routeName.substring(0, 18) + (s.routeName.length > 18 ? '...' : ''),
        assigned: s._count?.seatAssignments || 0,
        capacity: s.vehicle?.seats || 0,
      }))

      // Vehicle type distribution
      const vehicleTypeCounts = vehiclesArr.reduce((acc: any, v: any) => {
        acc[v.type] = (acc[v.type] || 0) + 1
        return acc
      }, {})
      const vehicleTypeData = Object.entries(vehicleTypeCounts).map(([name, value]) => ({ name, value }))

      // Driver status distribution
      const driverStatusCounts = driversArr.reduce((acc: any, d: any) => {
        acc[d.driverStatus] = (acc[d.driverStatus] || 0) + 1
        return acc
      }, {})
      const driverStatusData = Object.entries(driverStatusCounts).map(([name, value]) => ({ name, value }))

      // Booking revenue by status
      const bookingsByStatus = bookingsArr.reduce((acc: any, b: any) => {
        acc[b.status] = (acc[b.status] || 0) + 1
        return acc
      }, {})
      const bookingStatusData = Object.entries(bookingsByStatus).map(([name, value]) => ({ name, value }))

      // Revenue calculations retained as local fallback if the finance endpoint is unavailable.
      const totalRevenue = financeData?.summary.totalRevenue ?? bookingsArr
        .filter((b: any) => b.status === 'CONFIRMED')
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
      const totalRefunded = financeData?.summary.totalRefunds ?? bookingsArr
        .filter((b: any) => b.status === 'REFUNDED')
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
      const pendingRevenue = bookingsArr
        .filter((b: any) => b.status === 'PENDING')
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)

      // Revenue by month (last 6 months from createdAt)
      const now = new Date()
      const monthLabels: string[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        monthLabels.push(d.toLocaleString('en-GB', { month: 'short', year: '2-digit' }))
      }

      const revenueByMonth = monthLabels.map((label, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - (5 - idx) + 1, 1)
        const monthBookings = bookingsArr.filter((b: any) => {
          const created = new Date(b.createdAt)
          return created >= d && created < nextMonth && b.status === 'CONFIRMED'
        })
        const revenue = monthBookings.reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
        const count = monthBookings.length
        return { month: label, revenue: parseFloat(revenue.toFixed(2)), bookings: count }
      })

      // Bookings per route (top 8)
      const routeBookingCounts: Record<string, number> = {}
      bookingsArr.forEach((b: any) => {
        b.items?.forEach((item: any) => {
          const routeName = item.schedule?.routeName || 'Unknown'
          routeBookingCounts[routeName] = (routeBookingCounts[routeName] || 0) + 1
        })
      })
      const routeBookingData = Object.entries(routeBookingCounts)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 8)
        .map(([name, value]) => ({
          name: name.substring(0, 18) + (name.length > 18 ? '...' : ''),
          bookings: value
        }))

      setData({
        dash, routeUtilData, vehicleTypeData, driverStatusData,
        schedArr, driversArr, vehiclesArr, bookingsArr,
        bookingStatusData, totalRevenue, totalRefunded, pendingRevenue,
        revenueByMonth, routeBookingData, finance: financeData
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <DashboardLayout title="Analytics">
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </DashboardLayout>
  )

  const finance: FinanceDashboard | null = data?.finance ?? null

  return (
    <DashboardLayout title="Analytics">
      <div className="space-y-6">
        {/* Summary KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Pupils", value: data?.dash?.metrics?.totalPupils || 0, icon: Users, color: "text-blue-600" },
            { label: "Active Routes", value: data?.schedArr?.length || 0, icon: Route, color: "text-green-600" },
            { label: "Total Vehicles", value: data?.vehiclesArr?.length || 0, icon: Bus, color: "text-purple-600" },
            { label: "Active Drivers", value: data?.driversArr?.filter((d: any) => d.driverStatus === 'ACTIVE')?.length || 0, icon: Users, color: "text-orange-600" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-40`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Gross Revenue", value: money(finance?.summary.totalRevenue ?? data?.totalRevenue ?? 0), icon: PoundSterling, color: "text-green-600" },
            { label: "Refunds", value: money(finance?.summary.totalRefunds ?? data?.totalRefunded ?? 0), icon: RotateCcw, color: "text-red-600" },
            { label: "Net Revenue", value: money(finance?.summary.netRevenue ?? ((data?.totalRevenue || 0) - (data?.totalRefunded || 0))), icon: TrendingUp, color: "text-blue-600" },
            { label: "Avg Booking Value", value: money(finance?.summary.averageBookingValue ?? 0), icon: CreditCard, color: "text-purple-600" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-8 w-8 ${s.color} opacity-40`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Finance segmentation dashboard */}
        {finance && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><PoundSterling className="h-5 w-5" />Revenue and refunds by school</CardTitle></CardHeader>
              <CardContent>
                {finance.segments.bySchool.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={finance.segments.bySchool.slice(0, 10)} margin={{ top: 5, right: 10, bottom: 70, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#111827" name="Revenue" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="refunds" fill="#ef4444" name="Refunds" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-center py-8">No school finance data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Route className="h-5 w-5" />Revenue and refunds by route</CardTitle></CardHeader>
              <CardContent>
                {finance.segments.byRoute.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={finance.segments.byRoute.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 120 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#111827" name="Revenue" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="refunds" fill="#ef4444" name="Refunds" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-center py-8">No route finance data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Daily net revenue</CardTitle></CardHeader>
              <CardContent>
                {finance.segments.byDate.length > 0 ? (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={finance.segments.byDate} margin={{ top: 5, right: 20, bottom: 35, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => money(Number(value ?? 0))} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#111827" strokeWidth={2} name="Revenue" dot={false} />
                      <Line type="monotone" dataKey="refunds" stroke="#ef4444" strokeWidth={2} name="Refunds" dot={false} />
                      <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={2} name="Net" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-gray-500 text-center py-8">No daily finance data available</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment method segmentation</CardTitle></CardHeader>
              <CardContent>
                {finance.segments.byPaymentMethod.length > 0 ? (
                  <div className="space-y-3">
                    {finance.segments.byPaymentMethod.map(row => (
                      <div key={row.key} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">{row.label}</p>
                            <p className="text-xs text-gray-500">{row.bookings} paid bookings · {row.refundedBookings} refunded</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{money(row.net)}</p>
                            <p className="text-xs text-gray-500">net</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div className="rounded bg-gray-50 p-2 dark:bg-gray-900"><span className="text-gray-500">Revenue</span><p className="font-semibold">{money(row.revenue)}</p></div>
                          <div className="rounded bg-red-50 p-2 text-red-800 dark:bg-red-950"><span className="text-red-600">Refunds</span><p className="font-semibold">{money(row.refunds)}</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-500 text-center py-8">No payment method data available</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Booking Status & Revenue */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Booking Status</CardTitle></CardHeader>
            <CardContent>
              {data?.bookingStatusData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.bookingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.bookingStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 text-center py-8">No booking data</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PoundSterling className="h-5 w-5" />Revenue Overview</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "Gross Revenue", value: data?.totalRevenue || 0, color: "bg-green-500" },
                  { label: "Refunded", value: data?.totalRefunded || 0, color: "bg-red-500" },
                  { label: "Pending", value: data?.pendingRevenue || 0, color: "bg-yellow-500" },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{item.label}</span><span className="font-semibold">{money(item.value)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`${item.color} h-full`} style={{ width: `${Math.min((item.value / Math.max(data?.totalRevenue || 1, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Net Revenue</span>
                    <span className="text-2xl font-bold">{money((data?.totalRevenue || 0) - (data?.totalRefunded || 0))}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Trend */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Revenue Trend (Last 6 Months)</CardTitle></CardHeader>
          <CardContent>
            {data?.revenueByMonth?.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data.revenueByMonth} margin={{ top: 5, right: 30, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value, name) => name === 'revenue' ? money(Number(value ?? 0)) : value} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#000" fill="#000" fillOpacity={0.15} name="Revenue (£)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 text-center py-8">No revenue data available</p>}
          </CardContent>
        </Card>

        {/* Route Utilisation */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Route Utilisation (Assigned vs Capacity)</CardTitle></CardHeader>
          <CardContent>
            {data?.routeUtilData?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.routeUtilData} margin={{ top: 5, right: 5, bottom: 60, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-35} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="assigned" fill="#000" name="Assigned Seats" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="capacity" fill="#e5e7eb" name="Total Capacity" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No route data available</p>}
          </CardContent>
        </Card>

        {/* Top Routes by Bookings */}
        {data?.routeBookingData?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Top Routes by Bookings</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.routeBookingData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#000" name="Bookings" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Driver Status */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Driver Status Distribution</CardTitle></CardHeader>
            <CardContent>
              {data?.driverStatusData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.driverStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.driverStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No driver data</p>}
            </CardContent>
          </Card>

          {/* Summary Stats Table */}
          <Card>
            <CardHeader><CardTitle>Platform Summary</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Total Parents", value: data?.dash?.metrics?.totalParents || 0 },
                  { label: "Total Pupils", value: data?.dash?.metrics?.totalPupils || 0 },
                  { label: "Active Routes", value: data?.schedArr?.filter((s: any) => ['ACTIVE', 'SCHEDULED'].includes(s.status))?.length || 0 },
                  { label: "Total Bookings", value: data?.bookingsArr?.length || 0 },
                  { label: "Confirmed Bookings", value: data?.bookingsArr?.filter((b: any) => b.status === 'CONFIRMED')?.length || 0 },
                  { label: "Net Revenue", value: money(finance?.summary.netRevenue ?? ((data?.totalRevenue || 0) - (data?.totalRefunded || 0))) },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{row.label}</span>
                    <span className="font-semibold text-sm">{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
