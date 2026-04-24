import QRCode from 'qrcode'

// Generate a human-readable platform ID
export function generatePlatformId(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(5, '0')}`
}

// Build QR payload for a user (admin/employee/driver/parent)
export function buildUserQRPayload(user: {
  id: string
  name?: string | null
  platformId?: string | null
  address?: string | null
  dateOfBirth?: Date | null
  phone?: string | null
  role: string
}) {
  return JSON.stringify({
    type: 'USER',
    platformId: user.platformId || user.id,
    name: user.name || '',
    role: user.role,
    address: user.address || '',
    dob: user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().split('T')[0] : '',
    phone: user.phone || '',
    issued: new Date().toISOString(),
  })
}

// Build QR payload for a pupil (extended)
export function buildPupilQRPayload(pupil: {
  id: string
  fullName: string
  platformId?: string | null
  pickupLocation?: string | null
  dateOfBirth?: Date | null
  phone?: string | null
  parent?: {
    user?: {
      phone?: string | null
      name?: string | null
    }
  }
}) {
  return JSON.stringify({
    type: 'PUPIL',
    platformId: pupil.platformId || pupil.id,
    name: pupil.fullName,
    address: pupil.pickupLocation || '',
    dob: pupil.dateOfBirth ? new Date(pupil.dateOfBirth).toISOString().split('T')[0] : '',
    phone: pupil.phone || '',
    parentPhone: pupil.parent?.user?.phone || '',
    parentName: pupil.parent?.user?.name || '',
    issued: new Date().toISOString(),
  })
}

// Generate QR code as base64 data URL
export async function generateQRDataURL(payload: string): Promise<string> {
  try {
    const dataURL = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      width: 256,
    })
    return dataURL
  } catch (error) {
    console.error('QR generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

// Parse QR payload (read-only, no modification)
export function parseQRPayload(data: string): Record<string, string> | null {
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
