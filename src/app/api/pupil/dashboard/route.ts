import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

import prisma from '@/lib/prisma'
import { generateIdentityCode } from '@/lib/identity-code'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find pupil account linked to this user
    const pupilAccount = await prisma.pupilAccount.findUnique({
      where: { userId: session.user.id },
      include: {
        pupil: {
          include: {
            school: true,
            parent: { include: { user: { select: { name: true, phone: true, email: true } } } },
            seatAssignments: {
              include: {
                schedule: {
                  include: {
                    driver: {
                      include: {
                        user: { select: { name: true, phone: true, image: true } }
                      }
                    },
                    vehicle: { select: { regPlate: true, make: true, model: true, type: true } },
                    school: { select: { name: true } }
                  }
                }
              }
            },
            tripLogs: {
              include: {
                schedule: { select: { routeName: true, direction: true } },
                driver: {
                  include: { user: { select: { name: true, phone: true, image: true } } }
                },
                vehicle: { select: { regPlate: true } }
              },
              orderBy: { timestamp: 'desc' },
              take: 20
            },
            bookingItems: {
              where: { status: 'ACTIVE' },
              include: {
                schedule: {
                  include: {
                    driver: {
                      include: { user: { select: { name: true, phone: true, image: true } } }
                    },
                    vehicle: { select: { regPlate: true, make: true, model: true } },
                    school: { select: { name: true } }
                  }
                }
              },
              orderBy: { tripDate: 'asc' }
            }
          }
        }
      }
    })

    if (!pupilAccount) {
      return NextResponse.json({ error: 'Pupil account not found' }, { status: 404 })
    }

    const pupil = pupilAccount.pupil

    // Generate QR data if not exists
    let qrCodeData = pupil.qrCodeData
    if (!qrCodeData) {
      const qrPayload = {
        type: 'PUPIL',
        pupilId: pupil.id,
        platformId: pupil.platformId,
        fullName: pupil.fullName,
        yearLevel: pupil.yearLevel,
        schoolId: pupil.schoolId,
        schoolName: pupil.school?.name,
        parentPhone: pupil.parent.user.phone,
        parentEmail: pupil.parent.user.email,
        parentName: pupil.parent.user.name,
        pupilPhone: pupil.phone || null,
        emergencyContact: pupil.emergencyContactName,
        emergencyPhone: pupil.emergencyContactPhone,
        issuedAt: new Date().toISOString()
      }
      qrCodeData = JSON.stringify(qrPayload)
      await prisma.pupil.update({
        where: { id: pupil.id },
        data: { qrCodeData }
      })
    }

    // Upcoming trips (active bookings)
    const upcomingTrips = pupil.bookingItems
      .filter((b: any) => new Date(b.tripDate) >= new Date())
      .slice(0, 5)

    return NextResponse.json({
      pupil: {
        id: pupil.id,
        fullName: pupil.fullName,
        yearLevel: pupil.yearLevel,
        studentNumber: pupil.studentNumber,
        platformId: pupil.platformId,
        photo: pupil.photo,
        school: pupil.school,
        pickupLocation: pupil.pickupLocation,
        specialRequirements: pupil.specialRequirements,
        qrCodeData,
        identityCode: generateIdentityCode('PUPIL', pupil.id, pupil.platformId)
      },
      upcomingTrips,
      tripHistory: pupil.tripLogs,
      currentSchedules: pupil.seatAssignments
    })
  } catch (error) {
    console.error('Pupil dashboard error:', error)
    return NextResponse.json({ error: 'Failed to fetch pupil dashboard' }, { status: 500 })
  }
}
