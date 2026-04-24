import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import prisma from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, address } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        address: address || null,
        role: 'PARENT',
        status: 'PENDING',
      },
    })

    await prisma.parent.create({ data: { userId: user.id } })

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'CREATE',
        entity: 'USER',
        entityId: user.id,
        after: JSON.stringify({ email, role: 'PARENT', status: 'PENDING' }),
      },
    })

    return NextResponse.json({ message: 'Registration successful. Awaiting approval.' }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
