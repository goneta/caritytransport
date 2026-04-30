export interface RouteStopInput {
  pupilId: string
  pupilName: string
  pickupLocation?: string | null
  pickupPostcode?: string | null
  specialRequirements?: string | null
}

export interface RouteOptimizationContext {
  routeName: string
  direction: string
  departureTime?: string | null
  schoolName?: string | null
  schoolAddress?: string | null
  schoolPostcode?: string | null
  dropoffLocation?: string | null
  dropoffPostcode?: string | null
  currentPickupPostcode?: string | null
}

export interface OptimizedStop {
  pupilId: string
  pupilName: string
  address: string
  postcode: string | null
  estimatedTime: string
  sequence: number
  reason: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  specialRequirements?: string | null
}

interface ScoredStop extends RouteStopInput {
  address: string
  postcode: string | null
  x: number
  y: number
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
}

const POSTCODE_AREA_WEIGHTS: Record<string, [number, number]> = {
  AL: [51.75, -0.34], B: [52.48, -1.9], BA: [51.38, -2.36], BB: [53.75, -2.48], BD: [53.79, -1.75], BH: [50.72, -1.88], BL: [53.58, -2.43], BN: [50.83, -0.15], BR: [51.41, 0.02], BS: [51.45, -2.59],
  CB: [52.2, 0.12], CF: [51.48, -3.18], CH: [53.19, -2.89], CM: [51.74, 0.48], CO: [51.89, 0.9], CR: [51.37, -0.1], CT: [51.28, 1.08], CV: [52.41, -1.51], CW: [53.1, -2.44],
  DA: [51.45, 0.21], DE: [52.92, -1.48], DG: [55.07, -3.61], DH: [54.78, -1.58], DL: [54.53, -1.55], DN: [53.52, -1.13], DT: [50.71, -2.44], DY: [52.51, -2.08],
  E: [51.53, -0.05], EC: [51.52, -0.09], EH: [55.95, -3.19], EN: [51.65, -0.08], EX: [50.72, -3.53], FK: [56.0, -3.78], FY: [53.82, -3.05],
  G: [55.86, -4.25], GL: [51.86, -2.24], GU: [51.24, -0.57], HA: [51.58, -0.34], HD: [53.65, -1.78], HG: [53.99, -1.54], HP: [51.75, -0.47], HR: [52.06, -2.71], HS: [57.9, -6.8], HU: [53.75, -0.34], HX: [53.72, -1.86],
  IG: [51.56, 0.07], IP: [52.06, 1.16], IV: [57.48, -4.22], KA: [55.61, -4.5], KT: [51.39, -0.3], KW: [58.59, -3.53], KY: [56.11, -3.16],
  L: [53.41, -2.99], LA: [54.05, -2.8], LD: [52.24, -3.38], LE: [52.64, -1.13], LL: [53.14, -3.79], LN: [53.23, -0.54], LS: [53.8, -1.55], LU: [51.88, -0.42],
  M: [53.48, -2.24], ME: [51.38, 0.53], MK: [52.04, -0.76], ML: [55.78, -3.98], N: [51.56, -0.11], NE: [54.98, -1.61], NG: [52.95, -1.15], NN: [52.24, -0.9], NP: [51.59, -3.0], NR: [52.63, 1.3], NW: [51.55, -0.19],
  OL: [53.54, -2.11], OX: [51.75, -1.26], PA: [55.85, -4.42], PE: [52.57, -0.24], PH: [56.4, -3.43], PL: [50.38, -4.14], PO: [50.82, -1.09], PR: [53.76, -2.7],
  RG: [51.45, -0.97], RH: [51.12, -0.18], RM: [51.57, 0.18], S: [53.38, -1.47], SA: [51.62, -3.94], SE: [51.48, -0.08], SG: [51.9, -0.2], SK: [53.41, -2.16], SL: [51.51, -0.59], SM: [51.36, -0.2], SN: [51.56, -1.78], SO: [50.91, -1.4], SP: [51.07, -1.79], SR: [54.9, -1.39], SS: [51.55, 0.71], ST: [53.0, -2.18], SW: [51.46, -0.18], SY: [52.71, -2.75],
  TA: [51.02, -3.1], TD: [55.6, -2.78], TF: [52.68, -2.45], TN: [51.14, 0.27], TQ: [50.46, -3.53], TR: [50.26, -5.05], TS: [54.58, -1.23], TW: [51.45, -0.35],
  UB: [51.53, -0.46], W: [51.51, -0.2], WA: [53.39, -2.59], WC: [51.52, -0.12], WD: [51.66, -0.4], WF: [53.68, -1.5], WN: [53.55, -2.63], WR: [52.19, -2.22], WS: [52.59, -1.98], WV: [52.59, -2.13], YO: [53.96, -1.08], ZE: [60.15, -1.15],
}

function normalizePostcode(postcode?: string | null) {
  const normalized = (postcode || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (!normalized) return null
  const outward = normalized.length > 3 ? normalized.slice(0, -3) : normalized
  const area = outward.match(/^[A-Z]+/)?.[0] || null
  const district = Number(outward.match(/\d+/)?.[0] || 0)
  return { normalized, outward, area, district }
}

function addressHash(value: string) {
  return value.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 9973, 17)
}

function scoreStop(stop: RouteStopInput): ScoredStop {
  const address = [stop.pickupLocation, stop.pickupPostcode].filter(Boolean).join(', ') || 'Pickup address not recorded'
  const postcode = normalizePostcode(stop.pickupPostcode)
  const seeded = addressHash(address)

  if (postcode?.area && POSTCODE_AREA_WEIGHTS[postcode.area]) {
    const [lat, lon] = POSTCODE_AREA_WEIGHTS[postcode.area]
    const districtOffset = Math.min(postcode.district, 99) / 200
    return {
      ...stop,
      address,
      postcode: postcode.normalized,
      x: lon + districtOffset + (seeded % 37) / 10000,
      y: lat + districtOffset / 2 + (seeded % 29) / 10000,
      confidence: stop.pickupLocation ? 'HIGH' : 'MEDIUM',
    }
  }

  return {
    ...stop,
    address,
    postcode: postcode?.normalized || null,
    x: (seeded % 1000) / 100,
    y: (Math.floor(seeded / 10) % 1000) / 100,
    confidence: postcode ? 'MEDIUM' : 'LOW',
  }
}

function distance(a: Pick<ScoredStop, 'x' | 'y'>, b: Pick<ScoredStop, 'x' | 'y'>) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}

function minutesFromTime(time: string | null | undefined) {
  const match = (time || '').match(/^(\d{1,2}):(\d{2})/)
  if (!match) return 8 * 60
  return Math.min(23 * 60 + 59, Number(match[1]) * 60 + Number(match[2]))
}

function formatTime(totalMinutes: number) {
  const minutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60)
  const hh = String(Math.floor(minutes / 60)).padStart(2, '0')
  const mm = String(minutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

function solveNearestNeighbour(stops: ScoredStop[], direction: string) {
  if (stops.length <= 2) {
    return direction === 'SCHOOL_TO_HOME' ? [...stops].reverse() : [...stops]
  }

  const remaining = [...stops]
  const centroid = {
    x: remaining.reduce((sum, stop) => sum + stop.x, 0) / remaining.length,
    y: remaining.reduce((sum, stop) => sum + stop.y, 0) / remaining.length,
  }

  const startIndex = remaining.reduce((bestIndex, stop, index) => {
    const best = remaining[bestIndex]
    return distance(stop, centroid) > distance(best, centroid) ? index : bestIndex
  }, 0)

  const ordered = [remaining.splice(startIndex, 1)[0]]

  while (remaining.length > 0) {
    const current = ordered[ordered.length - 1]
    const nearestIndex = remaining.reduce((bestIndex, stop, index) => (
      distance(current, stop) < distance(current, remaining[bestIndex]) ? index : bestIndex
    ), 0)
    ordered.push(remaining.splice(nearestIndex, 1)[0])
  }

  return direction === 'SCHOOL_TO_HOME' ? ordered.reverse() : ordered
}

export function optimizePickupOrder(stops: RouteStopInput[], context: RouteOptimizationContext) {
  const scoredStops = stops
    .filter((stop) => stop.pupilId && stop.pupilName)
    .map(scoreStop)

  const orderedStops = solveNearestNeighbour(scoredStops, context.direction)
  const departure = minutesFromTime(context.departureTime)
  const stopSpacing = Math.max(4, Math.min(9, Math.round(40 / Math.max(orderedStops.length, 1))))
  const firstPickup = Math.max(5 * 60, departure - (orderedStops.length * stopSpacing + 12))

  const optimizedStops: OptimizedStop[] = orderedStops.map((stop, index) => ({
    pupilId: stop.pupilId,
    pupilName: stop.pupilName,
    address: stop.address,
    postcode: stop.postcode,
    estimatedTime: formatTime(firstPickup + index * stopSpacing),
    sequence: index + 1,
    reason: stop.postcode
      ? `Grouped by postcode ${stop.postcode} using nearest-neighbour routing from the outermost stop toward the destination.`
      : 'Placed using available address text because no postcode is recorded.',
    confidence: stop.confidence,
    specialRequirements: stop.specialRequirements || null,
  }))

  const missingAddressCount = stops.filter((stop) => !stop.pickupLocation && !stop.pickupPostcode).length
  const summary = optimizedStops.length === 0
    ? 'No assigned pupils with usable pickup details were available for optimization.'
    : `Suggested ${optimizedStops.length} pickup stops for ${context.routeName}. The assistant uses a deterministic nearest-neighbour postcode heuristic and preserves manual approval before saving.`

  return {
    routeName: context.routeName,
    direction: context.direction,
    destination: context.schoolName || context.dropoffLocation || context.dropoffPostcode || 'Route destination',
    generatedAt: new Date().toISOString(),
    algorithm: 'nearest_neighbour_postcode_heuristic',
    summary,
    warnings: [
      ...(missingAddressCount > 0 ? [`${missingAddressCount} assigned pupil(s) have no pickup location or postcode recorded.`] : []),
      ...(optimizedStops.some((stop) => stop.confidence === 'LOW') ? ['Some stops have low confidence because postcode data is missing.'] : []),
    ],
    stops: optimizedStops,
  }
}
