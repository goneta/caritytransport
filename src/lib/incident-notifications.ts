import prisma from '@/lib/prisma'
import { dispatchNotificationBulk } from '@/lib/notifications'

export type IncidentNotificationEvent = 'created' | 'updated'

const TYPE_LABELS: Record<string, string> = {
  DELAY: 'delay',
  VEHICLE_ISSUE: 'vehicle issue',
  BEHAVIOURAL_INCIDENT: 'behavioural incident',
  PUPIL_LEFT_BEHIND: 'pupil left behind concern',
  SAFEGUARDING: 'safeguarding concern',
  MEDICAL: 'medical incident',
  OTHER: 'transport incident',
}

function unique(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))))
}

function labelForIncidentType(type: string): string {
  return TYPE_LABELS[type] || type.toLowerCase().replace(/_/g, ' ')
}

function buildParentMessage(incident: Awaited<ReturnType<typeof loadIncidentForNotification>>, event: IncidentNotificationEvent): string {
  if (!incident) return ''

  const pupilName = incident.pupil?.fullName ? `${incident.pupil.fullName}'s ` : ''
  const routeText = incident.schedule?.routeName ? ` on ${incident.schedule.routeName}` : ''
  const typeText = labelForIncidentType(incident.incidentType)
  const statusText = incident.status ? ` Current status: ${incident.status.replace(/_/g, ' ').toLowerCase()}.` : ''
  const actionText = incident.actionTaken ? ` Action taken: ${incident.actionTaken}` : ''
  const summary = incident.parentNotificationSummary || incident.description

  if (event === 'created') {
    return `Carity Transport has recorded a ${incident.severity.toLowerCase()} ${typeText} involving ${pupilName}transport${routeText}. ${summary}${statusText}${actionText}`
  }

  return `Update for incident ${incident.reference}: ${pupilName}${typeText}${routeText}. ${summary}${statusText}${actionText}`
}

async function loadIncidentForNotification(incidentId: string) {
  return prisma.incidentReport.findUnique({
    where: { id: incidentId },
    include: {
      pupil: { include: { parent: { include: { user: { select: { id: true } } } } } },
      schedule: {
        select: {
          routeName: true,
          seatAssignments: {
            where: { status: 'ASSIGNED' },
            select: { pupil: { include: { parent: { include: { user: { select: { id: true } } } } } } },
          },
        },
      },
      tripLog: { select: { pupil: { include: { parent: { include: { user: { select: { id: true } } } } } } } },
    },
  })
}

export async function notifyParentsForIncident({
  incidentId,
  senderId,
  event,
}: {
  incidentId: string
  senderId?: string
  event: IncidentNotificationEvent
}): Promise<{ notified: boolean; recipientCount: number; summary?: string }> {
  const incident = await loadIncidentForNotification(incidentId)
  if (!incident || !incident.parentVisible) {
    return { notified: false, recipientCount: 0 }
  }

  const recipientIds = unique([
    incident.pupil?.parent.user.id,
    incident.tripLog?.pupil?.parent.user.id,
    ...(incident.schedule?.seatAssignments.map(assignment => assignment.pupil.parent.user.id) || []),
  ])

  if (recipientIds.length === 0) {
    return { notified: false, recipientCount: 0 }
  }

  const message = buildParentMessage(incident, event)
  await dispatchNotificationBulk(recipientIds, {
    senderId,
    type: event === 'created' ? 'INCIDENT_REPORTED' : 'INCIDENT_UPDATED',
    subject: event === 'created' ? `Transport incident ${incident.reference}` : `Incident update ${incident.reference}`,
    message,
    triggerEvent: event === 'created' ? 'INCIDENT_REPORTED' : 'INCIDENT_UPDATED',
  })

  if (!incident.parentNotified || incident.parentNotificationSummary !== message) {
    await prisma.incidentReport.update({
      where: { id: incident.id },
      data: {
        parentNotified: true,
        parentNotificationSummary: message,
      },
    })
  }

  return { notified: true, recipientCount: recipientIds.length, summary: message }
}
