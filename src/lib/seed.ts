import prisma from './prisma'
import bcrypt from 'bcryptjs'

export async function seedDatabase() {
  console.log('Seeding database...')

  // Clear existing data
  await prisma.basketItem.deleteMany()
  await prisma.bookingItem.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.seatAssignment.deleteMany()
  await prisma.absence.deleteMany()
  await prisma.tripLog.deleteMany()
  await prisma.chatMessage.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.document.deleteMany()
  await prisma.holidayPeriod.deleteMany()
  await prisma.transportSchedule.deleteMany()
  await prisma.pupil.deleteMany()
  await prisma.parent.deleteMany()
  await prisma.driver.deleteMany()
  await prisma.vehicle.deleteMany()
  await prisma.transportCompany.deleteMany()
  await prisma.school.deleteMany()
  await prisma.session.deleteMany()
  await prisma.user.deleteMany()
  await prisma.notificationTemplate.deleteMany()

  const hashedPassword = await bcrypt.hash('password123', 10)

  // ─── Users ──────────────────────────────────────────────────────────────────

  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'superadmin@carity.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      phone: '07700900001',
    },
  })

  const admin = await prisma.user.create({
    data: {
      name: 'Sarah Johnson',
      email: 'admin@carity.com',
      password: hashedPassword,
      role: 'ADMIN',
      phone: '07700900002',
    },
  })

  const scheduler = await prisma.user.create({
    data: {
      name: 'Mark Thompson',
      email: 'scheduler@carity.com',
      password: hashedPassword,
      role: 'SCHEDULER',
      phone: '07700900003',
    },
  })

  const ops = await prisma.user.create({
    data: {
      name: 'Lisa Chen',
      email: 'ops@carity.com',
      password: hashedPassword,
      role: 'OPERATIONS',
      phone: '07700900004',
    },
  })

  // Drivers
  const driverUser1 = await prisma.user.create({
    data: {
      name: 'James Anderson',
      email: 'james.driver@carity.com',
      password: hashedPassword,
      role: 'DRIVER',
      phone: '07700900010',
    },
  })
  const driverUser2 = await prisma.user.create({
    data: {
      name: 'Patricia Williams',
      email: 'pat.driver@carity.com',
      password: hashedPassword,
      role: 'DRIVER',
      phone: '07700900011',
    },
  })
  const driverUser3 = await prisma.user.create({
    data: {
      name: 'Robert Davies',
      email: 'rob.driver@carity.com',
      password: hashedPassword,
      role: 'DRIVER',
      phone: '07700900012',
    },
  })

  // Parents
  const parentUser1 = await prisma.user.create({
    data: {
      name: 'Emma Wilson',
      email: 'parent@carity.com',
      password: hashedPassword,
      role: 'PARENT',
      phone: '07700900020',
      address: '12 Oak Avenue, London, SW1A 1AA',
    },
  })
  const parentUser2 = await prisma.user.create({
    data: {
      name: 'David Brown',
      email: 'david.brown@example.com',
      password: hashedPassword,
      role: 'PARENT',
      phone: '07700900021',
      address: '45 Maple Street, London, EC1A 1BB',
    },
  })
  const parentUser3 = await prisma.user.create({
    data: {
      name: 'Sophie Taylor',
      email: 'sophie.taylor@example.com',
      password: hashedPassword,
      role: 'PARENT',
      phone: '07700900022',
      address: '8 Rose Gardens, London, N1 2CC',
    },
  })

  // ─── Schools ─────────────────────────────────────────────────────────────────

  const school1 = await prisma.school.create({
    data: {
      name: "St. Mary's Primary School",
      address: '1 Church Road, London, SW1A 2AA',
      postcode: 'SW1A',
      contactName: 'Mrs. Patricia Smith',
      contactPhone: '020 7946 0958',
      contactEmail: 'admin@stmarys.edu',
      startTime: '08:50',
      endTime: '15:20',
    },
  })

  const school2 = await prisma.school.create({
    data: {
      name: 'Oakwood Academy',
      address: '25 Forest Lane, London, N1 3BB',
      postcode: 'N1',
      contactName: 'Mr. James Collins',
      contactPhone: '020 7946 0959',
      contactEmail: 'admin@oakwood.edu',
      startTime: '08:30',
      endTime: '15:30',
    },
  })

  // ─── Transport Company ────────────────────────────────────────────────────────

  const company = await prisma.transportCompany.create({
    data: {
      name: 'SafeRide Transport Ltd',
      address: '100 Industrial Park, London, E1 6RF',
      phone: '020 7946 0800',
      email: 'info@saferide.co.uk',
      insuranceExpiry: new Date('2025-12-31'),
      contractStatus: 'ACTIVE',
    },
  })

  // ─── Vehicles ────────────────────────────────────────────────────────────────

  const bus1 = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      type: 'BUS',
      licenceClass: 'PCV',
      regPlate: 'LK71 ABC',
      make: 'Mercedes',
      model: 'Sprinter 519',
      seats: 20,
      motExpiry: new Date('2025-08-15'),
      status: 'ACTIVE',
    },
  })

  const minibus1 = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      type: 'MINIBUS',
      licenceClass: 'MINIBUS',
      regPlate: 'MN22 DEF',
      make: 'Ford',
      model: 'Transit 350',
      seats: 16,
      motExpiry: new Date('2025-06-30'),
      status: 'ACTIVE',
    },
  })

  const car1 = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      type: 'CAR',
      licenceClass: 'CAR',
      regPlate: 'SJ23 GHI',
      make: 'Toyota',
      model: 'Prius',
      seats: 4,
      motExpiry: new Date('2025-10-01'),
      status: 'ACTIVE',
    },
  })

  // ─── Drivers ─────────────────────────────────────────────────────────────────

  const driver1 = await prisma.driver.create({
    data: {
      userId: driverUser1.id,
      companyId: company.id,
      licenceNumber: 'ANDER701015JA9TR',
      licenceClass: 'PCV',
      licenceExpiry: new Date('2026-03-15'),
      dbsCheckDate: new Date('2024-01-10'),
      vehicleId: bus1.id,
      driverStatus: 'ACTIVE',
    },
  })

  const driver2 = await prisma.driver.create({
    data: {
      userId: driverUser2.id,
      companyId: company.id,
      licenceNumber: 'WILLI800215PW4TR',
      licenceClass: 'MINIBUS',
      licenceExpiry: new Date('2025-07-20'),
      dbsCheckDate: new Date('2024-02-15'),
      vehicleId: minibus1.id,
      driverStatus: 'ACTIVE',
    },
  })

  const driver3 = await prisma.driver.create({
    data: {
      userId: driverUser3.id,
      companyId: company.id,
      licenceNumber: 'DAVIE900110RD1TR',
      licenceClass: 'CAR',
      licenceExpiry: new Date('2027-01-05'),
      dbsCheckDate: new Date('2024-03-20'),
      vehicleId: car1.id,
      driverStatus: 'ACTIVE',
    },
  })

  // ─── Parents ─────────────────────────────────────────────────────────────────

  const parent1 = await prisma.parent.create({ data: { userId: parentUser1.id } })
  const parent2 = await prisma.parent.create({ data: { userId: parentUser2.id } })
  const parent3 = await prisma.parent.create({ data: { userId: parentUser3.id } })

  // ─── Pupils ──────────────────────────────────────────────────────────────────

  const pupil1 = await prisma.pupil.create({
    data: {
      fullName: 'Oliver Wilson',
      dateOfBirth: new Date('2015-04-12'),
      yearLevel: '4',
      studentNumber: 'SWS001',
      schoolId: school1.id,
      parentId: parent1.id,
      pickupLocation: '12 Oak Avenue, London',
      pickupPostcode: 'SW1A',
      activeTransport: true,
      emergencyContactName: 'Emma Wilson',
      emergencyContactPhone: '07700900020',
    },
  })

  const pupil2 = await prisma.pupil.create({
    data: {
      fullName: 'Sophia Wilson',
      dateOfBirth: new Date('2017-09-03'),
      yearLevel: '2',
      studentNumber: 'SWS002',
      schoolId: school1.id,
      parentId: parent1.id,
      pickupLocation: '12 Oak Avenue, London',
      pickupPostcode: 'SW1A',
      activeTransport: true,
      emergencyContactName: 'Emma Wilson',
      emergencyContactPhone: '07700900020',
    },
  })

  const pupil3 = await prisma.pupil.create({
    data: {
      fullName: 'Ethan Brown',
      dateOfBirth: new Date('2014-11-22'),
      yearLevel: '5',
      studentNumber: 'EBO003',
      schoolId: school2.id,
      parentId: parent2.id,
      pickupLocation: '45 Maple Street, London',
      pickupPostcode: 'EC1A',
      activeTransport: true,
    },
  })

  const pupil4 = await prisma.pupil.create({
    data: {
      fullName: 'Mia Taylor',
      dateOfBirth: new Date('2016-07-08'),
      yearLevel: '3',
      studentNumber: 'MTA004',
      schoolId: school1.id,
      parentId: parent3.id,
      pickupLocation: '8 Rose Gardens, London',
      pickupPostcode: 'N1',
      activeTransport: true,
    },
  })

  // ─── Transport Schedules ──────────────────────────────────────────────────────

  const schedule1 = await prisma.transportSchedule.create({
    data: {
      routeName: "Route A – Morning: St. Mary's",
      serviceType: 'PICKUP',
      direction: 'HOME_TO_SCHOOL',
      schoolId: school1.id,
      vehicleId: bus1.id,
      driverId: driver1.id,
      departureTime: '07:45',
      arrivalTime: '08:40',
      recurrence: 'WEEKDAYS',
      pickupPostcode: 'SW1A',
      dropoffPostcode: 'SW1A',
      pickupStops: JSON.stringify([
        { name: 'Oak Avenue Stop', postcode: 'SW1A 1AA', time: '07:45' },
        { name: 'High Street Stop', postcode: 'SW1A 1BB', time: '07:55' },
        { name: 'Park Road Stop', postcode: 'SW1A 1CC', time: '08:05' },
      ]),
      dropoffLocation: "St. Mary's Primary School, main gate",
      pricePerSeat: 3.50,
      status: 'SCHEDULED',
    },
  })

  const schedule2 = await prisma.transportSchedule.create({
    data: {
      routeName: "Route A – Afternoon: St. Mary's",
      serviceType: 'DROPOFF',
      direction: 'SCHOOL_TO_HOME',
      schoolId: school1.id,
      vehicleId: bus1.id,
      driverId: driver1.id,
      departureTime: '15:30',
      arrivalTime: '16:20',
      recurrence: 'WEEKDAYS',
      pickupPostcode: 'SW1A',
      dropoffPostcode: 'SW1A',
      dropoffLocation: 'Oak Avenue, Maple Street area',
      pricePerSeat: 3.50,
      status: 'SCHEDULED',
    },
  })

  const schedule3 = await prisma.transportSchedule.create({
    data: {
      routeName: 'Route B – Oakwood Academy Morning',
      serviceType: 'BOTH',
      direction: 'HOME_TO_SCHOOL',
      schoolId: school2.id,
      vehicleId: minibus1.id,
      driverId: driver2.id,
      departureTime: '08:00',
      arrivalTime: '08:25',
      recurrence: 'WEEKDAYS',
      pickupPostcode: 'EC1A',
      dropoffPostcode: 'N1',
      dropoffLocation: 'Oakwood Academy, front entrance',
      pricePerSeat: 2.75,
      status: 'SCHEDULED',
    },
  })

  const schedule4 = await prisma.transportSchedule.create({
    data: {
      routeName: 'Private Car – North London',
      serviceType: 'BOTH',
      direction: 'HOME_TO_SCHOOL',
      schoolId: school1.id,
      vehicleId: car1.id,
      driverId: driver3.id,
      departureTime: '08:15',
      arrivalTime: '08:45',
      recurrence: 'WEEKDAYS',
      pickupPostcode: 'N1',
      dropoffPostcode: 'SW1A',
      pricePerSeat: 5.00,
      status: 'SCHEDULED',
    },
  })

  // ─── Seat Assignments ────────────────────────────────────────────────────────

  await prisma.seatAssignment.createMany({
    data: [
      { scheduleId: schedule1.id, pupilId: pupil1.id, seatNumber: 1, status: 'ASSIGNED' },
      { scheduleId: schedule1.id, pupilId: pupil2.id, seatNumber: 2, status: 'ASSIGNED' },
      { scheduleId: schedule3.id, pupilId: pupil3.id, seatNumber: 1, status: 'ASSIGNED' },
      { scheduleId: schedule4.id, pupilId: pupil4.id, seatNumber: 1, status: 'ASSIGNED' },
    ],
  })

  // ─── Bookings (PRD2 data) ────────────────────────────────────────────────────

  const today = new Date()
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
  const nextWeekStr = nextWeek.toISOString().split('T')[0]

  const booking1 = await prisma.booking.create({
    data: {
      userId: parentUser1.id,
      status: 'CONFIRMED',
      totalAmount: 7.00,
      stripeSessionId: 'demo_session_001',
      stripePaymentId: 'pi_demo_001',
      items: {
        create: [
          {
            scheduleId: schedule1.id,
            pupilId: pupil1.id,
            seatNumber: 3,
            direction: 'HOME_TO_SCHOOL',
            tripDate: nextWeek,
            price: 3.50,
            status: 'ACTIVE',
          },
          {
            scheduleId: schedule1.id,
            pupilId: pupil2.id,
            seatNumber: 4,
            direction: 'HOME_TO_SCHOOL',
            tripDate: nextWeek,
            price: 3.50,
            status: 'ACTIVE',
          },
        ],
      },
      payment: {
        create: {
          amount: 7.00,
          currency: 'GBP',
          status: 'COMPLETED',
          stripeSessionId: 'demo_session_001',
          paidAt: new Date(),
        },
      },
    },
  })

  const booking2 = await prisma.booking.create({
    data: {
      userId: parentUser2.id,
      status: 'CONFIRMED',
      totalAmount: 2.75,
      items: {
        create: [
          {
            scheduleId: schedule3.id,
            pupilId: pupil3.id,
            seatNumber: 2,
            direction: 'HOME_TO_SCHOOL',
            tripDate: nextWeek,
            price: 2.75,
            status: 'ACTIVE',
          },
        ],
      },
      payment: {
        create: {
          amount: 2.75,
          currency: 'GBP',
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      },
    },
  })

  // Cancelled booking with refund
  const pastDate = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)
  const booking3 = await prisma.booking.create({
    data: {
      userId: parentUser3.id,
      status: 'REFUNDED',
      totalAmount: 5.00,
      cancelReason: 'Child is ill',
      cancelledAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      refundedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      refundable: true,
      items: {
        create: [
          {
            scheduleId: schedule4.id,
            pupilId: pupil4.id,
            seatNumber: 2,
            direction: 'HOME_TO_SCHOOL',
            tripDate: pastDate,
            price: 5.00,
            status: 'CANCELLED',
          },
        ],
      },
      payment: {
        create: {
          amount: 5.00,
          currency: 'GBP',
          status: 'REFUNDED',
          paidAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
      },
    },
  })

  // ─── Holiday Periods ─────────────────────────────────────────────────────────

  await prisma.holidayPeriod.createMany({
    data: [
      { schoolId: school1.id, name: 'Easter Break', startDate: new Date('2025-04-05'), endDate: new Date('2025-04-22') },
      { schoolId: school1.id, name: 'May Bank Holiday', startDate: new Date('2025-05-05'), endDate: new Date('2025-05-05') },
      { schoolId: school1.id, name: 'Summer Half-Term', startDate: new Date('2025-05-24'), endDate: new Date('2025-05-30') },
      { schoolId: school1.id, name: 'Summer Holiday', startDate: new Date('2025-07-19'), endDate: new Date('2025-09-02') },
      { schoolId: school2.id, name: 'Easter Break', startDate: new Date('2025-04-05'), endDate: new Date('2025-04-20') },
      { schoolId: school2.id, name: 'Summer Holiday', startDate: new Date('2025-07-20'), endDate: new Date('2025-09-02') },
    ],
  })

  // ─── Notifications ────────────────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        recipientId: parentUser1.id,
        type: 'IN_APP',
        subject: 'Booking Confirmed',
        message: 'Your booking for Oliver and Sophia on Route A has been confirmed.',
        triggerEvent: 'BOOKING_CONFIRMED',
        read: false,
      },
      {
        recipientId: parentUser1.id,
        type: 'IN_APP',
        subject: 'Bus Departing Soon',
        message: 'Route A – Morning bus departs in 15 minutes from Oak Avenue Stop.',
        triggerEvent: 'DEPARTURE_REMINDER',
        read: true,
      },
      {
        recipientId: parentUser2.id,
        type: 'IN_APP',
        subject: 'Booking Confirmed',
        message: "Your booking for Ethan on Route B (Oakwood Academy) has been confirmed.",
        triggerEvent: 'BOOKING_CONFIRMED',
        read: false,
      },
    ],
  })

  // ─── Notification Templates ───────────────────────────────────────────────────

  await prisma.notificationTemplate.createMany({
    data: [
      {
        name: 'Booking Confirmed',
        triggerEvent: 'BOOKING_CONFIRMED',
        smsTemplate: 'Your Carity booking is confirmed. Total: £{{amount}}. Booking ID: {{bookingId}}',
        emailSubject: 'Booking Confirmed – Carity',
        emailTemplate: '<p>Dear {{parentName}},</p><p>Your booking has been confirmed.</p>',
        active: true,
        updatedAt: new Date(),
      },
      {
        name: 'Departure Reminder',
        triggerEvent: 'DEPARTURE_REMINDER',
        smsTemplate: 'Your bus departs in 15 minutes. Route: {{routeName}}.',
        emailSubject: 'Bus Departing Soon – Carity',
        emailTemplate: '<p>Your bus is departing soon.</p>',
        active: true,
        updatedAt: new Date(),
      },
      {
        name: 'Booking Cancelled',
        triggerEvent: 'BOOKING_CANCELLED',
        smsTemplate: 'Your Carity booking has been cancelled. {{refundMessage}}',
        emailSubject: 'Booking Cancelled – Carity',
        emailTemplate: '<p>Your booking has been cancelled.</p>',
        active: true,
        updatedAt: new Date(),
      },
      {
        name: 'Licence Expiry Alert',
        triggerEvent: 'LICENCE_EXPIRY',
        smsTemplate: 'Alert: Driver {{driverName}} licence expires on {{expiryDate}}.',
        emailSubject: 'Driver Licence Expiring Soon – Carity',
        emailTemplate: '<p>Driver licence expiring alert.</p>',
        active: true,
        updatedAt: new Date(),
      },
    ],
  })

  // ─── Audit Log ────────────────────────────────────────────────────────────────

  await prisma.auditLog.createMany({
    data: [
      { userId: admin.id, action: 'CREATE', entity: 'TransportSchedule', entityId: schedule1.id, after: JSON.stringify({ routeName: schedule1.routeName }) },
      { userId: admin.id, action: 'CREATE', entity: 'TransportSchedule', entityId: schedule2.id, after: JSON.stringify({ routeName: schedule2.routeName }) },
      { userId: scheduler.id, action: 'CREATE', entity: 'Driver', entityId: driver1.id, after: JSON.stringify({ name: 'James Anderson' }) },
      { userId: admin.id, action: 'CREATE', entity: 'Vehicle', entityId: bus1.id, after: JSON.stringify({ regPlate: bus1.regPlate }) },
      { userId: admin.id, action: 'CREATE', entity: 'Booking', entityId: booking1.id, after: JSON.stringify({ amount: 7.00 }) },
    ],
  })

  console.log('✅ Seed complete!')
  return {
    logins: [
      { email: 'admin@carity.com', password: 'password123', role: 'ADMIN' },
      { email: 'superadmin@carity.com', password: 'password123', role: 'SUPER_ADMIN' },
      { email: 'parent@carity.com', password: 'password123', role: 'PARENT' },
      { email: 'james.driver@carity.com', password: 'password123', role: 'DRIVER' },
    ],
  }
}
