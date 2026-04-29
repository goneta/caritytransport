import { createHash } from 'node:crypto'

function toBase36Fragment(seed: string): string {
  const digest = createHash('sha256').update(seed).digest('hex')
  const numeric = BigInt(`0x${digest}`)
  return numeric.toString(36).toUpperCase()
}

export function generateIdentityCode(type: 'USER' | 'PUPIL', id: string, platformId?: string | null): string {
  const fragment = toBase36Fragment(`${type}:${platformId || id}:${id}`)
  return fragment.replace(/[^A-Z0-9]/g, '').padEnd(20, '0').slice(0, 20)
}
