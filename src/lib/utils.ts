import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatTime(time: string | null | undefined): string {
  if (!time) return 'N/A'
  return time
}

export function getDaysUntilExpiry(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const expiry = new Date(date)
  const today = new Date()
  const diff = expiry.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isExpiringSoon(date: Date | string | null | undefined, thresholdDays = 30): boolean {
  const days = getDaysUntilExpiry(date)
  if (days === null) return false
  return days >= 0 && days <= thresholdDays
}

export function isExpired(date: Date | string | null | undefined): boolean {
  const days = getDaysUntilExpiry(date)
  if (days === null) return false
  return days < 0
}

export function getStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'SCHEDULED':
    case 'ASSIGNED':
      return 'bg-green-100 text-green-800'
    case 'SUSPENDED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-800'
    case 'PENDING':
    case 'ON_LEAVE':
    case 'WAITLISTED':
      return 'bg-yellow-100 text-yellow-800'
    case 'COMPLETED':
      return 'bg-gray-100 text-gray-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}
