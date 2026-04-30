export const INCIDENT_TYPES = [
  'DELAY',
  'VEHICLE_ISSUE',
  'BEHAVIOURAL_INCIDENT',
  'PUPIL_LEFT_BEHIND',
  'SAFEGUARDING',
  'MEDICAL',
  'OTHER',
] as const

export const INCIDENT_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const
export const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'CLOSED'] as const

export const MAX_INCIDENT_ATTACHMENT_SIZE = 10 * 1024 * 1024
export const ALLOWED_INCIDENT_ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export type IncidentType = (typeof INCIDENT_TYPES)[number]
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number]

export function isIncidentType(value: unknown): value is IncidentType {
  return typeof value === 'string' && INCIDENT_TYPES.includes(value as IncidentType)
}

export function isIncidentSeverity(value: unknown): value is IncidentSeverity {
  return typeof value === 'string' && INCIDENT_SEVERITIES.includes(value as IncidentSeverity)
}

export function isIncidentStatus(value: unknown): value is IncidentStatus {
  return typeof value === 'string' && INCIDENT_STATUSES.includes(value as IncidentStatus)
}

export function generateIncidentReference(): string {
  return `INC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function validateIncidentAttachment(fileData: unknown): { ok: true; mimeType: string; sizeBytes: number } | { ok: false; error: string } {
  if (typeof fileData !== 'string' || !fileData.startsWith('data:')) {
    return { ok: false, error: 'Invalid file format. Must be a data URL.' }
  }

  const mimeMatch = fileData.match(/^data:([\w/+.-]+);base64,/)
  if (!mimeMatch || !ALLOWED_INCIDENT_ATTACHMENT_TYPES.includes(mimeMatch[1])) {
    return { ok: false, error: 'Only PDF, JPEG, PNG, and WebP files are allowed.' }
  }

  const base64Data = fileData.split(',')[1]
  if (!base64Data) {
    return { ok: false, error: 'Invalid file content.' }
  }

  const sizeBytes = Math.ceil((base64Data.length * 3) / 4)
  if (sizeBytes > MAX_INCIDENT_ATTACHMENT_SIZE) {
    return { ok: false, error: 'File too large. Maximum size is 10MB.' }
  }

  return { ok: true, mimeType: mimeMatch[1], sizeBytes }
}

export function redactAttachmentFileUrl<T extends { fileUrl?: string | null }>(attachment: T): T & { fileUrl?: string } {
  return { ...attachment, fileUrl: attachment.fileUrl ? '[REDACTED]' : attachment.fileUrl || undefined }
}
