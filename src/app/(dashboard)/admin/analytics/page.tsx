"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, AreaChart, Area
} from "recharts"
import { BarChart3, TrendingUp, Users, Bus, Route, CreditCard, PoundSterling, Percent } from "lucide-react"
import { Loader2 } from "lucide-react"

const COLORS = ['#000', '#333', '#555', '#777', '#999', '#bbb']

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
    ]).then(([dash, schedules, drivers, vehicles, bookings]) => {
      const schedArr = Array.isArray(schedules) ? schedules : []
      const driversArr = Array.isArray(drivers) ? drivers : []
      const vehiclesArr = Array.isArray(vehicles) ? vehicles : []
      const bookingsArr = Array.isArray(bookings) ? bookings : []

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

      // Revenue calculations
      const totalRevenue = bookingsArr
        .filter((b: any) => b.status === 'CONFIRMED')
        .reduce((sum: number, b: any) => sum + (b.totalAmount || 0), 0)
      const totalRefunded = bookingsArr
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
        revenueByMonth, routeBookingData
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <DashboardLayout title="Analytics">
      <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    </DashboardLayout>
  )

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
            { label: "Confirmed Revenue", value: `£${(data?.totalRevenue || 0).toFixed(2)}`, icon: PoundSterling, bg: "bg-green-50", color: "text-green-700" },
            { label: "Total Bookings", value: data?.bookingsArr?.length || 0, icon: CreditCard, bg: "bg-blue-50", color: "text-blue-700" },
            { label: "Refunded", value: `£${(data?.totalRefunded || 0).toFixed(2)}`, icon: TrendingUp, bg: "bg-red-50", color: "text-red-700" },
            {
              label: "Conversion Rate",
              value: data?.bookingsArr?.length
                ? `${Math.round((data.bookingsArr.filter((b: any) => b.status === 'CONFIRMED').length / data.bookingsArr.length) * 100)}%`
                : '0%',
              icon: Percent,
              bg: "bg-purple-50",
              color: "text-purple-700"
            },
          ].map((s, i) => (
            <Card key={i} className={s.bg}>
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wide ${s.color} opacity-70`}>{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <s.icon className={`h-7 w-7 ${s.color} opacity-30`} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Revenue by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PoundSterling className="h-5 w-5" />Monthly Revenue (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.revenueByMonth?.some((m: any) => m.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={data.revenueByMonth} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
                  <Tooltip formatter={(v: unknown) => [`£${Number(v).toFixed(2)}`, 'Revenue']} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={2} fill="url(#revenueGrad)" name="Revenue (£)" />
                  <Bar dataKey="bookings" fill="#ccc" name="Bookings" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                <CreditCard className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No booking revenue data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Booking Status Distribution */}
          <Card>
            <CardHeader><CardTitle>Booking Status Distribution</CardTitle></CardHeader>
            <CardContent>
              {data?.bookingStatusData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.bookingStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.bookingStatusData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500">No booking data</div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Type Pie */}
          <Card>
            <CardHeader><CardTitle>Fleet by Vehicle Type</CardTitle></CardHeader>
            <CardContent>
              {data?.vehicleTypeData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.vehicleTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                      label={({ name, value }) => `${name}: ${value}`}>
                      {data.vehicleTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-gray-500 dark:text-gray-400 text-center py-8">No vehicle data</p>}
            </CardContent>
          </Card>
        </div>

        {/* Route Utilisation Chart */}
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
                  { label: "Net Revenue", value: `£${((data?.totalRevenue || 0) - (data?.totalRefunded || 0)).toFixed(2)}` },
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
