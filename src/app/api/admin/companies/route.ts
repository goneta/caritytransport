import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const companies = await prisma.transportCompany.findMany({
      include: {
        vehicles: true,
        drivers: { include: { user: { select: { name: true } } } },
      },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(companies)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const company = await prisma.transportCompany.create({
      data: {
        name: data.name,
        address: data.address || null,
        phone: data.phone || null,
        insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
        contractStatus: data.contractStatus || 'ACTIVE',
      },
    })
    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json()
    const { id, ...fields } = data

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const company = await prisma.transportCompany.update({
      where: { id },
      data: {
        ...(fields.name !== undefined && { name: fields.name }),
        ...(fields.address !== undefined && { address: fields.address }),
        ...(fields.phone !== undefined && { phone: fields.phone }),
        ...(fields.email !== undefined && { email: fields.email }),
        ...(fields.insuranceExpiry !== undefined && { insuranceExpiry: fields.insuranceExpiry ? new Date(fields.insuranceExpiry) : null }),
        ...(fields.contractStatus !== undefined && { contractStatus: fields.contractStatus }),
      },
    })

    return NextResponse.json(company)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    await prisma.transportCompany.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
