import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { isAdminRole } from '@/lib/moderated-chat'

type Contact = {
  id: string
  name: string
  role: string
  email?: string | null
  phone?: string | null
  context?: string
}

const adminRoles = ['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS']

function uniqueContacts(contacts: Contact[]): Contact[] {
  const seen = new Set<string>()
  return contacts.filter((contact) => {
    if (seen.has(contact.id)) return false
    seen.add(contact.id)
    return true
  })
}

async function getOperationsContacts(): Promise<Contact[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: adminRoles }, status: 'ACTIVE' },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true, email: true, phone: true },
  })

  return users.map((user) => ({ ...user, name: user.name || user.email, context: 'Operations support' }))
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true },
    })
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    let contacts: Contact[] = []

    if (isAdminRole(currentUser.role)) {
      const users = await prisma.user.findMany({
        where: {
          id: { not: currentUser.id },
          role: { in: ['PARENT', 'DRIVER', ...adminRoles] },
          status: { not: 'SUSPENDED' },
        },
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, role: true, email: true, phone: true },
      })
      contacts = users.map((user) => ({ ...user, name: user.name || user.email, context: 'Directory contact' }))
    } else if (currentUser.role === 'PARENT') {
      const parent = await prisma.parent.findUnique({
        where: { userId: currentUser.id },
        include: {
          pupils: {
            include: {
              seatAssignments: {
                where: { status: 'ASSIGNED' },
                include: {
                  schedule: {
                    include: { driver: { include: { user: { select: { id: true, name: true, role: true, email: true, phone: true } } } } },
                  },
                },
              },
              bookingItems: {
                where: { status: 'ACTIVE' },
                include: {
                  schedule: {
                    include: { driver: { include: { user: { select: { id: true, name: true, role: true, email: true, phone: true } } } } },
                  },
                },
              },
            },
          },
        },
      })

      const routeDrivers: Contact[] = []
      parent?.pupils.forEach((pupil) => {
        pupil.seatAssignments.forEach((assignment) => {
          const user = assignment.schedule.driver?.user
          if (user) routeDrivers.push({ ...user, name: user.name || user.email, context: `${pupil.fullName} route driver` })
        })
        pupil.bookingItems.forEach((item) => {
          const user = item.schedule.driver?.user
          if (user) routeDrivers.push({ ...user, name: user.name || user.email, context: `${pupil.fullName} route driver` })
        })
      })

      contacts = [...routeDrivers, ...(await getOperationsContacts())]
    } else if (currentUser.role === 'DRIVER') {
      const driver = await prisma.driver.findUnique({
        where: { userId: currentUser.id },
        include: {
          schedules: {
            where: { status: { not: 'CANCELLED' } },
            include: {
              seatAssignments: { include: { pupil: { include: { parent: { include: { user: { select: { id: true, name: true, role: true, email: true, phone: true } } } } } } } },
              bookingItems: { include: { booking: { include: { user: { select: { id: true, name: true, role: true, email: true, phone: true } } } } } },
            },
          },
        },
      })

      const parents: Contact[] = []
      driver?.schedules.forEach((schedule) => {
        schedule.seatAssignments.forEach((assignment) => {
          const user = assignment.pupil.parent.user
          parents.push({ ...user, name: user.name || user.email, context: `${assignment.pupil.fullName} parent` })
        })
        schedule.bookingItems.forEach((item) => {
          const user = item.booking.user
          parents.push({ ...user, name: user.name || user.email, context: `${schedule.routeName} booking parent` })
        })
      })

      contacts = [...parents, ...(await getOperationsContacts())]
    } else {
      contacts = await getOperationsContacts()
    }

    return NextResponse.json({ contacts: uniqueContacts(contacts).filter((contact) => contact.id !== currentUser.id) })
  } catch (error) {
    console.error('Chat contacts error:', error)
    return NextResponse.json({ error: 'Failed to load chat contacts' }, { status: 500 })
  }
}
