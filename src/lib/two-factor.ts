import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const ADMIN_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'SCHEDULER', 'OPERATIONS'])

export function isTwoFactorEligibleRole(role?: string | null) {
  return role === 'DRIVER' || ADMIN_ROLES.has(role || '')
}

export function isAdminLikeRole(role?: string | null) {
  return ADMIN_ROLES.has(role || '')
}

export async function getSecurityPolicy() {
  return prisma.securityPolicy.upsert({
    where: { id: 'global' },
    update: {},
    create: { id: 'global' },
  })
}

export function getTwoFactorPolicyRequirement(role: string | null | undefined, policy: { requireAdminTwoFactor: boolean; requireDriverTwoFactor: boolean }) {
  if (role === 'DRIVER') return policy.requireDriverTwoFactor
  if (ADMIN_ROLES.has(role || '')) return policy.requireAdminTwoFactor
  return false
}

export function generateBase32Secret(bytes = 20) {
  const buffer = crypto.randomBytes(bytes)
  let bits = 0
  let value = 0
  let output = ''
  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function base32ToBuffer(secret: string) {
  const clean = secret.replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase()
  let bits = 0
  let value = 0
  const bytes: number[] = []
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: number, digits = 6) {
  const key = base32ToBuffer(secret)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const code = ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return String(code % 10 ** digits).padStart(digits, '0')
}

export function verifyTotpToken(secret: string, token: string, window = 1) {
  const normalized = token.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(normalized)) return false
  const counter = Math.floor(Date.now() / 30000)
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, counter + offset)
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(normalized))) return true
  }
  return false
}

export function makeOtpAuthUrl(email: string, secret: string) {
  const issuer = 'Carity Transport'
  const label = `${issuer}:${email}`
  const params = new URLSearchParams({ secret, issuer, algorithm: 'SHA1', digits: '6', period: '30' })
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
}

export function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(9).toString('hex').toUpperCase()
    return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`
  })
}

export async function hashRecoveryCodes(codes: string[]) {
  return Promise.all(codes.map(code => bcrypt.hash(normalizeRecoveryCode(code), 10)))
}

function normalizeRecoveryCode(code: string) {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export async function verifySecondFactorForLogin(user: { id: string; twoFactorSecret: string | null; twoFactorRecoveryCodes: string | null }, token: string) {
  const input = token.trim()
  if (!user.twoFactorSecret || !input) return false

  if (verifyTotpToken(user.twoFactorSecret, input)) {
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorLastUsedAt: new Date() } })
    return true
  }

  const stored = user.twoFactorRecoveryCodes ? JSON.parse(user.twoFactorRecoveryCodes) as string[] : []
  const normalized = normalizeRecoveryCode(input)
  for (let index = 0; index < stored.length; index += 1) {
    if (await bcrypt.compare(normalized, stored[index])) {
      const remaining = stored.filter((_, current) => current !== index)
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorRecoveryCodes: JSON.stringify(remaining), twoFactorLastUsedAt: new Date() },
      })
      return true
    }
  }

  return false
}
