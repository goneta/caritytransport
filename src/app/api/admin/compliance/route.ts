import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import prisma from "@/lib/prisma"

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "SCHEDULER", "OPERATIONS"])
const WARNING_DAYS = 45

type SessionUser = {
  role?: string | null
}

type ComplianceStatus = "EXPIRED" | "EXPIRING_SOON" | "CURRENT" | "MISSING"

type ExpiryItem = {
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

function daysUntil(date: Date | null | undefined) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000)
}

function statusFor(date: Date | null | undefined): ComplianceStatus {
  const days = daysUntil(date)
  if (days === null) return "MISSING"
  if (days < 0) return "EXPIRED"
  if (days <= WARNING_DAYS) return "EXPIRING_SOON"
  return "CURRENT"
}

function expiryIso(date: Date | null | undefined) {
  return date ? new Date(date).toISOString() : null
}

function sortRiskFirst(a: ExpiryItem, b: ExpiryItem) {
  const rank: Record<ComplianceStatus, number> = { EXPIRED: 0, EXPIRING_SOON: 1, MISSING: 2, CURRENT: 3 }
  return rank[a.status] - rank[b.status] || (a.daysUntilExpiry ?? 99999) - (b.daysUntilExpiry ?? 99999) || a.ownerName.localeCompare(b.ownerName)
}

export async function GET() {
  try {
    const session = await auth()
    const role = (session?.user as SessionUser | undefined)?.role ?? ""
    if (!session?.user?.id || !ADMIN_ROLES.has(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const [drivers, vehicles, companies, documents] = await Promise.all([
      prisma.driver.findMany({
        include: {
          user: { select: { name: true, email: true, phone: true } },
          company: { select: { name: true } },
          schedules: {
            select: {
              routeName: true,
              vehicle: { select: { id: true, regPlate: true, make: true, model: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.vehicle.findMany({
        include: {
          company: { select: { name: true } },
        },
        orderBy: { regPlate: "asc" },
      }),
      prisma.transportCompany.findMany({ orderBy: { name: "asc" } }),
      prisma.document.findMany({
        where: {
          OR: [
            { entityType: "DRIVER" },
            { entityType: "VEHICLE" },
            { entityType: "COMPANY" },
          ],
        },
        orderBy: { createdAt: "desc" },
      }),
    ])

    const latestTrainingByDriver = new Map<string, (typeof documents)[number]>()
    for (const document of documents) {
      const docType = document.docType.toLowerCase()
      if (document.entityType === "DRIVER" && (docType.includes("training") || docType.includes("certificate") || docType.includes("cpc"))) {
        if (!latestTrainingByDriver.has(document.entityId)) latestTrainingByDriver.set(document.entityId, document)
      }
    }

    const items: ExpiryItem[] = []

    for (const driver of drivers) {
      const ownerName = driver.user.name || driver.user.email || "Unnamed driver"
      items.push({
        id: `${driver.id}:licence`,
        category: "LICENCE",
        ownerType: "DRIVER",
        ownerId: driver.id,
        ownerName,
        detail: `${driver.licenceClass || "Licence"}${driver.company?.name ? ` · ${driver.company.name}` : ""}`,
        expiryDate: expiryIso(driver.licenceExpiry),
        daysUntilExpiry: daysUntil(driver.licenceExpiry),
        status: statusFor(driver.licenceExpiry),
      })

      const training = latestTrainingByDriver.get(driver.id)
      items.push({
        id: `${driver.id}:training`,
        category: "TRAINING",
        ownerType: "DRIVER",
        ownerId: driver.id,
        ownerName,
        detail: training ? training.docType : "No training record uploaded",
        expiryDate: expiryIso(training?.expiryDate),
        daysUntilExpiry: daysUntil(training?.expiryDate),
        status: statusFor(training?.expiryDate),
      })
    }

    for (const vehicle of vehicles) {
      const vehicleName = `${vehicle.regPlate}${vehicle.make || vehicle.model ? ` · ${[vehicle.make, vehicle.model].filter(Boolean).join(" ")}` : ""}`
      items.push({
        id: `${vehicle.id}:mot`,
        category: "VEHICLE_INSPECTION",
        ownerType: "VEHICLE",
        ownerId: vehicle.id,
        ownerName: vehicleName,
        detail: `Vehicle inspection / MOT${vehicle.company?.name ? ` · ${vehicle.company.name}` : ""}`,
        expiryDate: expiryIso(vehicle.motExpiry),
        daysUntilExpiry: daysUntil(vehicle.motExpiry),
        status: statusFor(vehicle.motExpiry),
      })
      items.push({
        id: `${vehicle.id}:insurance`,
        category: "VEHICLE_INSURANCE",
        ownerType: "VEHICLE",
        ownerId: vehicle.id,
        ownerName: vehicleName,
        detail: `Vehicle insurance${vehicle.company?.name ? ` · ${vehicle.company.name}` : ""}`,
        expiryDate: expiryIso(vehicle.insuranceExpiry),
        daysUntilExpiry: daysUntil(vehicle.insuranceExpiry),
        status: statusFor(vehicle.insuranceExpiry),
      })
    }

    for (const company of companies) {
      items.push({
        id: `${company.id}:insurance`,
        category: "COMPANY_INSURANCE",
        ownerType: "COMPANY",
        ownerId: company.id,
        ownerName: company.name,
        detail: "Company insurance",
        expiryDate: expiryIso(company.insuranceExpiry),
        daysUntilExpiry: daysUntil(company.insuranceExpiry),
        status: statusFor(company.insuranceExpiry),
      })
    }

    const sortedItems = items.sort(sortRiskFirst)
    const summary = sortedItems.reduce((acc, item) => {
      acc.total += 1
      acc[item.status] += 1
      return acc
    }, { total: 0, EXPIRED: 0, EXPIRING_SOON: 0, CURRENT: 0, MISSING: 0 })

    const byCategory = sortedItems.reduce<Record<string, { total: number; alerts: number }>>((acc, item) => {
      acc[item.category] = acc[item.category] ?? { total: 0, alerts: 0 }
      acc[item.category].total += 1
      if (["EXPIRED", "EXPIRING_SOON", "MISSING"].includes(item.status)) acc[item.category].alerts += 1
      return acc
    }, {})

    return NextResponse.json({
      warningDays: WARNING_DAYS,
      summary,
      byCategory,
      alerts: sortedItems.filter(item => item.status !== "CURRENT"),
      items: sortedItems,
    })
  } catch (error) {
    console.error("Admin compliance dashboard error", error)
    return NextResponse.json({ error: "Failed to load compliance dashboard" }, { status: 500 })
  }
}
