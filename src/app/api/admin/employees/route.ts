import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'
import { writeAdminAuditLogForRequest } from '@/lib/admin-audit'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''

    const employees = await prisma.user.findMany({
      where: {
        role: { in: ['ADMIN', 'SCHEDULER', 'OPERATIONS', 'SUPER_ADMIN'] },
        ...(search && {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(employees)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, role, password } = await req.json()
    const hashedPassword = await bcrypt.hash(password || 'staff123', 10)

    const user = await prisma.user.create({
      data: {
        name, email, phone,
        password: hashedPassword,
        role: role || 'ADMIN',
        status: 'ACTIVE',
      },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
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
      where: { id },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.email !== undefined && { email: fields.email }),
        ...(fields.phone !== undefined && { phone: fields.phone }),
        ...(fields.role !== undefined && { role: fields.role }),
        ...(fields.status !== undefined && { status: fields.status }),
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.user.delete({ where: { id } })

    await writeAdminAuditLogForRequest({ request: req, action: 'DELETE', entity: 'Employee', entityId: id, before: null, after: null })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
