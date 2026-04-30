import { createHash, randomBytes, timingSafeEqual } from 'crypto'
import prisma from '@/lib/prisma'
import { notifyParentsForTripEvent } from '@/lib/trip-event-notifications'

const GUARDIAN_QR_TYPE = 'GUARDIAN_PICKUP'

export function generateGuardianPin() {
  return randomBytes(4).readUInt32BE(0).toString().padStart(10, '0').slice(0, 6)
}

export function hashGuardianPin(pin: string) {
  return createHash('sha256').update(normalizeGuardianCode(pin)).digest('hex')
}

export function verifyGuardianPin(pin: string, pinHash: string) {
  const submitted = Buffer.from(hashGuardianPin(pin))
  const stored = Buffer.from(pinHash)
  return submitted.length === stored.length && timingSafeEqual(submitted, stored)
}

export function normalizeGuardianCode(code: string) {
  return code.trim().replace(/\s+/g, '').toUpperCase()
}

export function createGuardianQrPayload(input: { guardianId: string; pupilId: string; nonce?: string }) {
  return JSON.stringify({
    type: GUARDIAN_QR_TYPE,
    guardianId: input.guardianId,
    pupilId: input.pupilId,
    code: input.nonce || randomBytes(12).toString('hex').toUpperCase(),
  })
}

export function parseGuardianQrPayload(qrData: unknown) {
  const payload = typeof qrData === 'string' ? JSON.parse(qrData) : qrData
  if (!payload || typeof payload !== 'object') return null
  const record = payload as Record<string, unknown>
  if (record.type !== GUARDIAN_QR_TYPE) return null
  if (typeof record.guardianId !== 'string' || typeof record.pupilId !== 'string' || typeof record.code !== 'string') return null
  return { guardianId: record.guardianId, pupilId: record.pupilId, code: record.code }
}

export async function verifyGuardianPickup(input: {
  sessionUserId: string
  pupilId: string
  scheduleId?: string | null
  verificationCode?: string | null
  qrData?: string | Record<string, unknown> | null
}) {
  const driver = await prisma.driver.findFirst({ where: { userId: input.sessionUserId } })
  if (!driver) {
    return { response: { error: 'Driver not found', valid: false, outcome: 'red' as const, message: 'Driver not found' }, status: 404 }
  }

  if (input.scheduleId) {
    const assignedSchedule = await prisma.transportSchedule.findFirst({
      where: { id: input.scheduleId, driverId: driver.id },
      select: { id: true, departureTime: true }
    })
    if (!assignedSchedule) {
      return { response: { error: 'Schedule not assigned to this driver', valid: false, outcome: 'red' as const, message: 'Schedule not assigned to this driver' }, status: 403 }
    }
  }

  const pupil = await prisma.pupil.findUnique({
    where: { id: input.pupilId },
    include: {
      school: { select: { name: true } },
      parent: { include: { user: { select: { name: true, phone: true, email: true } } } },
      bookingItems: {
        where: { status: 'ACTIVE', ...(input.scheduleId ? { scheduleId: input.scheduleId } : {}) },
        include: { schedule: { select: { departureTime: true } } }
      },
      seatAssignments: { where: input.scheduleId ? { scheduleId: input.scheduleId } : undefined }
    }
  })

  if (!pupil) {
    return { response: { valid: false, outcome: 'red' as const, message: 'Pupil not found' }, status: 404 }
  }

  if (input.scheduleId && pupil.bookingItems.length === 0 && pupil.seatAssignments.length === 0) {
    return { response: { valid: false, outcome: 'red' as const, message: `${pupil.fullName} is not assigned or booked on this route` }, status: 400 }
  }

  const now = new Date()
  const guardians = await prisma.authorizedGuardian.findMany({
    where: {
      pupilId: input.pupilId,
      status: 'ACTIVE',
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    }
  })

  let matchedGuardian = null as null | typeof guardians[number]
  let method: 'PIN' | 'QR' = 'PIN'

  if (input.qrData) {
    try {
      const payload = parseGuardianQrPayload(input.qrData)
      if (payload && payload.pupilId === input.pupilId) {
        matchedGuardian = guardians.find((guardian) => guardian.id === payload.guardianId && guardian.qrCodeData === JSON.stringify({ type: GUARDIAN_QR_TYPE, guardianId: payload.guardianId, pupilId: payload.pupilId, code: payload.code })) || null
        method = 'QR'
      }
    } catch {
      matchedGuardian = null
    }
  }

  if (!matchedGuardian && input.verificationCode) {
    const normalizedCode = normalizeGuardianCode(input.verificationCode)
    matchedGuardian = guardians.find((guardian) => verifyGuardianPin(normalizedCode, guardian.pinHash)) || null
    method = 'PIN'
  }

  if (!matchedGuardian) {
    await prisma.pickupVerification.create({
      data: {
        guardianId: guardians[0]?.id || 'unmatched',
        pupilId: input.pupilId,
        scheduleId: input.scheduleId || null,
        driverId: driver.id,
        method,
        status: 'DENIED',
        notes: 'Pickup release denied because no active authorized guardian matched the supplied QR/PIN.'
      }
    }).catch(() => null)
    return { response: { valid: false, outcome: 'red' as const, message: `Release denied for ${pupil.fullName}: guardian QR/PIN did not match an active authorization` }, status: 400 }
  }

  const tripLog = input.scheduleId ? await prisma.tripLog.create({
    data: {
      scheduleId: input.scheduleId,
      pupilId: input.pupilId,
      driverId: driver.id,
      status: 'DROPPED',
      qrScanned: method === 'QR',
      notes: `Guardian pickup verified: ${matchedGuardian.name} (${matchedGuardian.relationship}) via ${method}`
    }
  }) : null

  await prisma.pickupVerification.create({
    data: {
      guardianId: matchedGuardian.id,
      pupilId: input.pupilId,
      scheduleId: input.scheduleId || null,
      driverId: driver.id,
      tripLogId: tripLog?.id || null,
      method,
      status: 'VERIFIED',
      notes: `Released to ${matchedGuardian.name} (${matchedGuardian.relationship})`
    }
  })

  let notifiedParent = 0
  if (input.scheduleId) {
    notifiedParent = await notifyParentsForTripEvent({
      scheduleId: input.scheduleId,
      status: 'DROPPED',
      pupilId: input.pupilId,
      departureTime: pupil.bookingItems[0]?.schedule?.departureTime,
      senderId: input.sessionUserId,
    })
  }

  return {
    response: {
      valid: true,
      outcome: 'green' as const,
      message: `Release verified: ${pupil.fullName} may be released to ${matchedGuardian.name}`,
      scan: { boardingRecorded: false, routeId: input.scheduleId || null, notifiedParent: notifiedParent > 0, pickupVerified: true },
      guardian: { id: matchedGuardian.id, name: matchedGuardian.name, relationship: matchedGuardian.relationship, phone: matchedGuardian.phone },
      pupil: {
        id: pupil.id,
        fullName: pupil.fullName,
        yearLevel: pupil.yearLevel,
        school: pupil.school?.name || null,
        specialRequirements: pupil.specialRequirements,
        parentName: pupil.parent.user.name,
        parentPhone: pupil.parent.user.phone,
        parentEmail: pupil.parent.user.email,
        pupilPhone: pupil.phone
      }
    },
    status: 200
  }
}
