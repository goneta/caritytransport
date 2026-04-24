import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    // id here is the parent record id OR userId - handle both
    const parent = await prisma.parent.findFirst({
      where: { OR: [{ id }, { userId: id }] },
      include: {
        pupils: {
          include: { school: { select: { name: true } } },
        },
      },
    })
    if (!parent) return NextResponse.json([])
    return NextResponse.json(parent.pupils)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch pupils' }, { status: 500 })
  }
}
