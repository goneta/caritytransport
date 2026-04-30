import prisma from '@/lib/prisma'
import { dispatchNotification } from '@/lib/notifications'

type TripEventStatus = 'BOARDED' | 'ARRIVED_SCHOOL' | 'DROPPED'

const TRIP_EVENT_COPY: Record<TripEventStatus, { subject: string; action: string; triggerEvent: string }> = {
  BOARDED: {
    subject: 'Child boarded',
    action: 'has boarded',
    triggerEvent: 'TRIP_CHILD_BOARDED',
  },
  ARRIVED_SCHOOL: {
    subject: 'Arrived at school',
    action: 'has arrived at school on',
    triggerEvent: 'TRIP_ARRIVED_SCHOOL',
  },
  DROPPED: {
    subject: 'Child dropped off',
    action: 'has been dropped off from',
    triggerEvent: 'TRIP_CHILD_DROPPED_OFF',
  },
}

interface NotifyTripEventParentsInput {
  scheduleId: string
  status: string
  pupilId?: string | null
  vehicleLabel?: string | null
  departureTime?: string | null
  senderId?: string | null
}

interface ParentTripEvent {
  parentUserId: string
  pupilNames: Set<string>
}

function isKeyTripEvent(status: string): status is TripEventStatus {
  return status === 'BOARDED' || status === 'ARRIVED_SCHOOL' || status === 'DROPPED'
}

function formatNames(names: string[]): string {
  if (names.length === 0) return 'Your child'
  if (names.length === 1) return names[0]
  if (names.length === 2) return `${names[0]} and ${names[1]}`
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`
}

/**
 * Sends parent notifications for key trip events through the shared dispatcher.
 * The dispatcher always creates the in-app record and only attempts SMS when
 * Twilio-compatible environment variables and user SMS preferences are present.
 */
export async function notifyParentsForTripEvent(input: NotifyTripEventParentsInput): Promise<number> {
  if (!isKeyTripEvent(input.status)) return 0

  const schedule = await prisma.transportSchedule.findUnique({
    where: { id: input.scheduleId },
    select: {
      routeName: true,
      departureTime: true,
      dropoffLocation: true,
      school: { select: { name: true } },
    },
  })

  const bookingItems = await prisma.bookingItem.findMany({
    where: {
      scheduleId: input.scheduleId,
      status: 'ACTIVE',
      ...(input.pupilId ? { pupilId: input.pupilId } : {}),
      booking: { status: 'CONFIRMED' },
    },
    select: {
      pupil: { select: { fullName: true } },
      booking: { select: { userId: true } },
    },
  })

  const recipients = new Map<string, ParentTripEvent>()
  for (const item of bookingItems) {
    const parentUserId = item.booking.userId
    if (!recipients.has(parentUserId)) {
      recipients.set(parentUserId, { parentUserId, pupilNames: new Set<string>() })
    }
    recipients.get(parentUserId)?.pupilNames.add(item.pupil.fullName)
  }

  if (recipients.size === 0) return 0

  const copy = TRIP_EVENT_COPY[input.status]
  const routeName = schedule?.routeName || 'their Carity route'
  const schoolName = schedule?.school?.name || schedule?.dropoffLocation || 'school'
  const departureTime = input.departureTime || schedule?.departureTime
  const vehicleText = input.vehicleLabel ? ` Vehicle: ${input.vehicleLabel}.` : ''
  const timeText = departureTime ? ` Scheduled time: ${departureTime}.` : ''

  await Promise.allSettled(
    Array.from(recipients.values()).map(({ parentUserId, pupilNames }) => {
      const names = formatNames(Array.from(pupilNames))
      const destinationText = input.status === 'ARRIVED_SCHOOL' ? ` ${schoolName}` : ` ${routeName}`
      return dispatchNotification({
        recipientId: parentUserId,
        senderId: input.senderId || undefined,
        type: 'TRIP_EVENT',
        subject: `${copy.subject}: ${names}`,
        message: `${names} ${copy.action}${destinationText}.${vehicleText}${timeText}`,
        triggerEvent: copy.triggerEvent,
      })
    })
  )

  return recipients.size
}
