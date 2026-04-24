import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const postcode = searchParams.get('postcode') || ''
    const schoolId = searchParams.get('schoolId') || ''
    const serviceType = searchParams.get('serviceType') || ''
    const tripDate = searchParams.get('date') || ''
    const preferredTime = searchParams.get('time') || ''

    if (!postcode && !schoolId) {
      return NextResponse.json({ error: 'Postcode or school required' }, { status: 400 })
    }

    const searchDate = tripDate ? new Date(tripDate) : null
    const dayOfWeek = searchDate ? ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][searchDate.getDay()] : null

    // Build where conditions based on search params
    const schedules = await prisma.transportSchedule.findMany({
      where: {
        status: { in: ['SCHEDULED', 'ACTIVE'] },
        ...(serviceType && { serviceType }),
        ...(schoolId && { schoolId }),
        // Postcode matching - check pickup postcode or stops
        ...(postcode && {
          OR: [
            { pickupPostcode: { contains: postcode.toUpperCase().substring(0, 3) } },
            { pickupStops: { contains: postcode.toUpperCase().substring(0, 3) } },
            { dropoffPostcode: { contains: postcode.toUpperCase().substring(0, 3) } },
          ],
        }),
      },
      include: {
        school: { select: { id: true, name: true, address: true } },
        vehicle: { select: { id: true, regPlate: true, type: true, model: true, make: true, seats: true } },
        driver: { include: { user: { select: { name: true } } } },
        bookingItems: {
          where: {
            status: 'ACTIVE',
            ...(searchDate && { tripDate: searchDate }),
          },
        },
        _count: {
          select: {
            bookingItems: {
              where: {
                status: 'ACTIVE',
                ...(searchDate && { tripDate: searchDate }),
              },
            },
          },
        },
      },
      orderBy: { departureTime: 'asc' },
    })

    // Filter by recurrence/day of week if date is provided
    const filtered = schedules.filter((s: any) => {
      if (dayOfWeek && s.recurrence === 'WEEKDAYS' && ['SAT', 'SUN'].includes(dayOfWeek)) return false
      if (dayOfWeek && s.recurrence === 'CUSTOM' && s.customDays) {
        try {
          const days = JSON.parse(s.customDays) as string[]
          if (!days.includes(dayOfWeek)) return false
        } catch {}
      }
      // Filter by preferred time (±1 hour)
      if (preferredTime && s.departureTime) {
        const [ph, pm] = preferredTime.split(':').map(Number)
        const [sh, sm] = s.departureTime.split(':').map(Number)
        const diff = Math.abs((ph * 60 + pm) - (sh * 60 + sm))
        if (diff > 60) return false
      }
      return true
    })

    // Calculate available seats for each schedule
    const results = filtered.map((s: any) => {
      const bookedSeats = s.bookingItems.map((bi: any) => bi.seatNumber)
      const totalSeats = s.vehicle?.seats || 0
      const availableSeats = totalSeats - s._count.bookingItems
      return {
        ...s,
        availableSeats,
        totalSeats,
        bookedSeats,
        bookingItems: undefined, // Remove raw booking items
      }
    })

    // Only return schedules with available seats
    const available = results.filter((s: any) => s.availableSeats > 0)

    return NextResponse.json(available)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to search schedules' }, { status: 500 })
  }
}
