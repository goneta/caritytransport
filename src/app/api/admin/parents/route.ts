import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    const parents = await prisma.user.findMany({
      where: {
        role: 'PARENT',
        ...(status && { status }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
          ],
        }),
      },
      include: {
        parent: {
          include: {
            pupils: {
              include: { school: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(parents)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch parents' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, address, status, notifySMS, notifyEmail } = await req.json()

    const hashedPassword = await bcrypt.hash(password || 'temp123', 10)
    const user = await prisma.user.create({
      data: {
        name, email,
        password: hashedPassword,
        phone, address,
        role: 'PARENT',
        status: status || 'ACTIVE',
        notifySMS: notifySMS ?? true,
        notifyEmail: notifyEmail ?? true,
      },
    })
    await prisma.parent.create({ data: { userId: user.id } })

    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create parent' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id, role: 'PARENT' },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.email !== undefined && { email: fields.email }),
        ...(fields.phone !== undefined && { phone: fields.phone }),
        ...(fields.address !== undefined && { address: fields.address }),
        ...(fields.status !== undefined && { status: fields.status }),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update parent' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Delete parent record first, then the user
    await prisma.parent.deleteMany({ where: { userId: id } })
    await prisma.user.delete({ where: { id } })

    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'Parent', entityId: id, before: null, after: null })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete parent' }, { status: 500 })
  }
}
