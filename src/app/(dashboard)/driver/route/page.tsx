"use client"
import DashboardLayout from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Route, MapPin, Clock, School } from "lucide-react"

export default function DriverRoutePage() {
  return (
    <DashboardLayout title="My Route">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-12 text-center">
            <Route className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-600 dark:text-gray-400">Route details</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Select a route from the Manifest page to view full route details</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
