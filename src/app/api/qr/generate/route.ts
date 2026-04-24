import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const targetId = searchParams.get('userId') || session.user.id
    const type = searchParams.get('type') || 'user' // user | pupil

    let qrPayload: Record<string, unknown>

    if (type === 'pupil') {
      const pupil = await prisma.pupil.findUnique({
        where: { id: targetId },
        include: {
          parent: { include: { user: true } },
          school: true
        }
      })

      if (!pupil) {
        return NextResponse.json({ error: 'Pupil not found' }, { status: 404 })
      }

      // Build pupil QR payload with parent phone numbers and optional pupil phone
      qrPayload = {
        type: 'PUPIL',
        pupilId: pupil.id,
        platformId: pupil.platformId,
        fullName: pupil.fullName,
        dateOfBirth: pupil.dateOfBirth?.toISOString() || null,
        address: pupil.pickupLocation || null,
        yearLevel: pupil.yearLevel,
        schoolId: pupil.schoolId,
        schoolName: pupil.school?.name,
        parentPhone: pupil.parent.user.phone,
        parentEmail: pupil.parent.user.email,
        parentName: pupil.parent.user.name,
        pupilPhone: pupil.phone || null,
        emergencyContact: pupil.emergencyContactName,
        emergencyPhone: pupil.emergencyContactPhone,
        specialRequirements: pupil.specialRequirements,
        issuedAt: new Date().toISOString()
      }

      // Update pupil qrCodeData
      await prisma.pupil.update({
        where: { id: pupil.id },
        data: { qrCodeData: JSON.stringify(qrPayload) }
      })
    } else {
      // User QR (admin, employee, driver, parent)
      const user = await prisma.user.findUnique({
        where: { id: targetId },
        include: { driver: true }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      qrPayload = {
        type: 'USER',
        userId: user.id,
        platformId: user.platformId,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address || null,
        dateOfBirth: user.dateOfBirth?.toISOString() || null,
        licenceNumber: user.driver?.licenceNumber || null,
        licenceClass: user.driver?.licenceClass || null,
        issuedAt: new Date().toISOString()
      }

      // Update user qrCodeData
      await prisma.user.update({
        where: { id: user.id },
        data: { qrCodeData: JSON.stringify(qrPayload) }
      })
    }

    const qrPayloadStr = JSON.stringify(qrPayload)

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(qrPayloadStr, {
      width: 300,
      margin: 2,
      color: { dark: '#1e293b', light: '#ffffff' }
    })

    return NextResponse.json({ qrDataUrl, payload: qrPayload })
  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}
