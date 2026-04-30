import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { createGuardianQrPayload, generateGuardianPin, hashGuardianPin } from '@/lib/guardian-verification'

function serializeGuardian(guardian: any, pickupPin?: string) {
  const { pinHash, ...safeGuardian } = guardian
  return pickupPin ? { ...safeGuardian, pickupPin } : safeGuardian
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parent = await prisma.parent.findUnique({ where: { userId: session.user.id } })
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const data = await req.json()
    const pupilId = String(data.pupilId || '')
    const name = String(data.name || '').trim()
    const relationship = String(data.relationship || '').trim()
    if (!pupilId || !name || !relationship) {
      return NextResponse.json({ error: 'Pupil, guardian name, and relationship are required' }, { status: 400 })
    }

    const pupil = await prisma.pupil.findFirst({ where: { id: pupilId, parentId: parent.id } })
    if (!pupil) return NextResponse.json({ error: 'Pupil not found for this parent' }, { status: 404 })

    const pickupPin = generateGuardianPin()
    const guardian = await prisma.authorizedGuardian.create({
      data: {
        parentId: parent.id,
        pupilId,
        name,
        relationship,
        phone: data.phone ? String(data.phone).trim() : null,
        email: data.email ? String(data.email).trim() : null,
        validFrom: data.validFrom ? new Date(data.validFrom) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        pinHash: hashGuardianPin(pickupPin),
      }
    })

    const updated = await prisma.authorizedGuardian.update({
      where: { id: guardian.id },
      data: { qrCodeData: createGuardianQrPayload({ guardianId: guardian.id, pupilId }) },
    })

    return NextResponse.json(serializeGuardian(updated, pickupPin), { status: 201 })
  } catch (error) {
    console.error('Create authorized guardian error:', error)
    return NextResponse.json({ error: 'Failed to create authorized guardian' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const parent = await prisma.parent.findUnique({ where: { userId: session.user.id } })
    if (!parent) return NextResponse.json({ error: 'Parent not found' }, { status: 404 })

    const data = await req.json()
    const id = String(data.id || '')
    if (!id) return NextResponse.json({ error: 'Guardian id required' }, { status: 400 })

    const guardian = await prisma.authorizedGuardian.findFirst({ where: { id, parentId: parent.id } })
    if (!guardian) return NextResponse.json({ error: 'Authorized guardian not found' }, { status: 404 })

    const updated = await prisma.authorizedGuardian.update({
      where: { id },
      data: {
        status: data.status === 'ACTIVE' ? 'ACTIVE' : 'REVOKED',
        validUntil: data.status === 'ACTIVE' ? guardian.validUntil : new Date(),
      }
    })

    return NextResponse.json(serializeGuardian(updated))
  } catch (error) {
    console.error('Update authorized guardian error:', error)
    return NextResponse.json({ error: 'Failed to update authorized guardian' }, { status: 500 })
  }
}
