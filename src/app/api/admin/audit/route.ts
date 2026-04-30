import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')?.trim()
    const entity = searchParams.get('entity')?.trim()
    const userId = searchParams.get('userId')?.trim()
    const from = searchParams.get('from')?.trim()
    const to = searchParams.get('to')?.trim()
    const query = searchParams.get('q')?.trim()
    const limitParam = Number(searchParams.get('limit') || 100)
    const take = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 250) : 100

    const where: any = {
      ...(action && { action }),
      ...(entity && { entity }),
      ...(userId && { userId }),
      ...((from || to) && {
        timestamp: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
      ...(query && {
        OR: [
          { action: { contains: query } },
          { entity: { contains: query } },
          { entityId: { contains: query } },
          { ipAddress: { contains: query } },
          { user: { name: { contains: query } } },
          { user: { email: { contains: query } } },
        ],
      }),
    }

    const [logs, facets] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.findMany({
        select: { action: true, entity: true },
        distinct: ['action', 'entity'],
        orderBy: [{ entity: 'asc' }, { action: 'asc' }],
      }),
    ])

    return NextResponse.json({
      logs,
      filters: {
        actions: Array.from(new Set(facets.map(item => item.action))).sort(),
        entities: Array.from(new Set(facets.map(item => item.entity))).sort(),
      },
    })
  } catch (error) {
    console.error('Failed to fetch audit logs', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
