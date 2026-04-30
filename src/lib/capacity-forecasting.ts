type ForecastBookingItem = {
  id: string
  tripDate: Date | string
  status?: string | null
  schedule?: {
    id: string
    routeName: string
    direction: string
    serviceType: string
    departureTime: string
    school?: { name: string | null } | null
  } | null
  booking?: { status?: string | null } | null
}

type ForecastSchedule = {
  id: string
  routeName: string
  direction: string
  serviceType: string
  departureTime: string
  status: string
  school?: { name: string | null } | null
  vehicle?: { seats: number | null } | null
  _count?: { seatAssignments?: number }
}

export type CapacityForecastRecommendation = {
  routeKey: string
  routeName: string
  schoolName: string | null
  direction: string
  serviceType: string
  currentCapacity: number
  assignedSeats: number
  historicalBookings: number
  observedServiceDays: number
  averageDemandPerTrip: number
  peakDemand: number
  projectedDemand: number
  utilization: number
  trendPercent: number
  recommendation: 'ADD_CAPACITY' | 'CUT_CAPACITY' | 'MONITOR'
  recommendedSeatChange: number
  recommendedCapacity: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  rationale: string
}

export type CapacityForecastSummary = {
  generatedAt: string
  planningTerm: string
  lookbackDays: number
  routesAnalyzed: number
  routesToAddCapacity: number
  routesToCutCapacity: number
  routesToMonitor: number
  totalRecommendedSeatDelta: number
  recommendations: CapacityForecastRecommendation[]
}

function termLabel(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()

  if (month <= 3) return `Spring ${year}`
  if (month <= 7) return `Summer ${year}`
  return `Autumn ${year}`
}

function nextPlanningTerm(now = new Date()) {
  const next = new Date(now)
  next.setMonth(next.getMonth() + 1)
  return termLabel(next)
}

function routeKeyFromParts(routeName: string, schoolName: string | null | undefined, direction: string, serviceType: string) {
  return [routeName || 'Unnamed route', schoolName || 'No school', direction || 'UNKNOWN', serviceType || 'UNKNOWN']
    .map((part) => String(part).trim().toUpperCase())
    .join('::')
}

function routeKeyFromSchedule(schedule: NonNullable<ForecastBookingItem['schedule']> | ForecastSchedule) {
  return routeKeyFromParts(
    schedule.routeName,
    schedule.school?.name,
    schedule.direction,
    schedule.serviceType,
  )
}

function roundOne(value: number) {
  return Math.round(value * 10) / 10
}

function confidenceFor(observedServiceDays: number, historicalBookings: number): CapacityForecastRecommendation['confidence'] {
  if (observedServiceDays >= 30 && historicalBookings >= 90) return 'HIGH'
  if (observedServiceDays >= 10 && historicalBookings >= 25) return 'MEDIUM'
  return 'LOW'
}

export function buildCapacityForecast(
  schedules: ForecastSchedule[],
  bookingItems: ForecastBookingItem[],
  now = new Date(),
): CapacityForecastSummary {
  const lookbackDays = 365
  const cutoff = new Date(now)
  cutoff.setDate(cutoff.getDate() - lookbackDays)

  const currentRoutes = new Map<string, {
    routeName: string
    schoolName: string | null
    direction: string
    serviceType: string
    currentCapacity: number
    assignedSeats: number
  }>()

  for (const schedule of schedules) {
    const key = routeKeyFromSchedule(schedule)
    const existing = currentRoutes.get(key) || {
      routeName: schedule.routeName,
      schoolName: schedule.school?.name || null,
      direction: schedule.direction,
      serviceType: schedule.serviceType,
      currentCapacity: 0,
      assignedSeats: 0,
    }

    existing.currentCapacity += Math.max(0, schedule.vehicle?.seats || 0)
    existing.assignedSeats += Math.max(0, schedule._count?.seatAssignments || 0)
    currentRoutes.set(key, existing)
  }

  const bookingsByRoute = new Map<string, {
    total: number
    dailyDemand: Map<string, number>
    recentTotal: number
    previousTotal: number
    recentDays: Set<string>
    previousDays: Set<string>
    sampleRoute?: NonNullable<ForecastBookingItem['schedule']>
  }>()

  const recentCutoff = new Date(now)
  recentCutoff.setDate(recentCutoff.getDate() - 90)
  const previousCutoff = new Date(now)
  previousCutoff.setDate(previousCutoff.getDate() - 180)

  for (const item of bookingItems) {
    if (!item.schedule) continue
    if (item.status && ['CANCELLED', 'REFUNDED', 'VOID'].includes(item.status.toUpperCase())) continue
    if (item.booking?.status && ['CANCELLED', 'REFUNDED', 'VOID'].includes(item.booking.status.toUpperCase())) continue

    const tripDate = new Date(item.tripDate)
    if (Number.isNaN(tripDate.getTime()) || tripDate < cutoff || tripDate > now) continue

    const key = routeKeyFromSchedule(item.schedule)
    const existing = bookingsByRoute.get(key) || {
      total: 0,
      dailyDemand: new Map<string, number>(),
      recentTotal: 0,
      previousTotal: 0,
      recentDays: new Set<string>(),
      previousDays: new Set<string>(),
      sampleRoute: item.schedule,
    }

    const dateKey = tripDate.toISOString().slice(0, 10)
    existing.total += 1
    existing.dailyDemand.set(dateKey, (existing.dailyDemand.get(dateKey) || 0) + 1)

    if (tripDate >= recentCutoff) {
      existing.recentTotal += 1
      existing.recentDays.add(dateKey)
    } else if (tripDate >= previousCutoff) {
      existing.previousTotal += 1
      existing.previousDays.add(dateKey)
    }

    bookingsByRoute.set(key, existing)
  }

  for (const [key, demand] of bookingsByRoute) {
    if (currentRoutes.has(key) || !demand.sampleRoute) continue
    currentRoutes.set(key, {
      routeName: demand.sampleRoute.routeName,
      schoolName: demand.sampleRoute.school?.name || null,
      direction: demand.sampleRoute.direction,
      serviceType: demand.sampleRoute.serviceType,
      currentCapacity: 0,
      assignedSeats: 0,
    })
  }

  const recommendations: CapacityForecastRecommendation[] = Array.from(currentRoutes.entries()).map(([routeKey, route]) => {
    const demand = bookingsByRoute.get(routeKey)
    const observedServiceDays = demand?.dailyDemand.size || 0
    const historicalBookings = demand?.total || 0
    const averageDemandPerTrip = observedServiceDays > 0 ? historicalBookings / observedServiceDays : route.assignedSeats
    const peakDemand = demand?.dailyDemand.size ? Math.max(...demand.dailyDemand.values()) : route.assignedSeats
    const recentAverage = demand && demand.recentDays.size > 0 ? demand.recentTotal / demand.recentDays.size : averageDemandPerTrip
    const previousAverage = demand && demand.previousDays.size > 0 ? demand.previousTotal / demand.previousDays.size : averageDemandPerTrip
    const trendPercent = previousAverage > 0 ? ((recentAverage - previousAverage) / previousAverage) * 100 : 0
    const trendMultiplier = Math.min(1.35, Math.max(0.75, 1 + (trendPercent / 100) * 0.5))
    const projectedDemand = Math.max(route.assignedSeats, averageDemandPerTrip * trendMultiplier, peakDemand * 0.85)
    const effectiveCapacity = route.currentCapacity || route.assignedSeats || Math.ceil(projectedDemand)
    const utilization = effectiveCapacity > 0 ? projectedDemand / effectiveCapacity : 0
    const recommendedCapacity = Math.max(0, Math.ceil(projectedDemand * 1.15))
    const recommendedSeatChange = recommendedCapacity - effectiveCapacity

    let recommendation: CapacityForecastRecommendation['recommendation'] = 'MONITOR'
    if (effectiveCapacity === 0 || utilization >= 0.9 || projectedDemand > effectiveCapacity) {
      recommendation = 'ADD_CAPACITY'
    } else if (utilization <= 0.45 && effectiveCapacity - recommendedCapacity >= 4) {
      recommendation = 'CUT_CAPACITY'
    }

    const confidence = confidenceFor(observedServiceDays, historicalBookings)
    const directionText = route.direction.replace(/_/g, ' ').toLowerCase()
    const rationale = recommendation === 'ADD_CAPACITY'
      ? `Projected ${roundOne(projectedDemand)} pupils per service is close to or above the current ${effectiveCapacity}-seat capacity on the ${directionText} service.`
      : recommendation === 'CUT_CAPACITY'
        ? `Projected utilisation is ${Math.round(utilization * 100)}%, so the route may be able to release spare seats or consolidate capacity.`
        : `Projected utilisation is ${Math.round(utilization * 100)}%, so keep capacity steady and continue monitoring demand.`

    return {
      routeKey,
      routeName: route.routeName,
      schoolName: route.schoolName,
      direction: route.direction,
      serviceType: route.serviceType,
      currentCapacity: effectiveCapacity,
      assignedSeats: route.assignedSeats,
      historicalBookings,
      observedServiceDays,
      averageDemandPerTrip: roundOne(averageDemandPerTrip),
      peakDemand,
      projectedDemand: roundOne(projectedDemand),
      utilization: roundOne(utilization * 100),
      trendPercent: roundOne(trendPercent),
      recommendation,
      recommendedSeatChange,
      recommendedCapacity,
      confidence,
      rationale,
    }
  })

  const sortedRecommendations = recommendations
    .sort((a, b) => {
      const priority = { ADD_CAPACITY: 0, CUT_CAPACITY: 1, MONITOR: 2 }
      const priorityDiff = priority[a.recommendation] - priority[b.recommendation]
      if (priorityDiff !== 0) return priorityDiff
      return Math.abs(b.recommendedSeatChange) - Math.abs(a.recommendedSeatChange)
    })
    .slice(0, 8)

  return {
    generatedAt: now.toISOString(),
    planningTerm: nextPlanningTerm(now),
    lookbackDays,
    routesAnalyzed: recommendations.length,
    routesToAddCapacity: recommendations.filter((item) => item.recommendation === 'ADD_CAPACITY').length,
    routesToCutCapacity: recommendations.filter((item) => item.recommendation === 'CUT_CAPACITY').length,
    routesToMonitor: recommendations.filter((item) => item.recommendation === 'MONITOR').length,
    totalRecommendedSeatDelta: recommendations.reduce((sum, item) => sum + item.recommendedSeatChange, 0),
    recommendations: sortedRecommendations,
  }
}
