import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import prisma from '@/lib/prisma'

// Max size: 2MB encoded as base64 data URL
const MAX_SIZE_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { image } = await req.json()

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Validate it's a data URL (base64 image)
    if (!image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Invalid image format. Must be a data URL.' }, { status: 400 })
    }

    // Check allowed mime types
    const mimeMatch = image.match(/^data:(image\/(?:jpeg|jpg|png|gif|webp));base64,/)
    if (!mimeMatch) {
      return NextResponse.json({ error: 'Only JPEG, PNG, GIF and WebP images are allowed.' }, { status: 400 })
    }

    // Check file size (base64 is ~4/3 the original size)
    const base64Data = image.split(',')[1]
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4)
    if (sizeBytes > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Image too large. Maximum size is 2MB.' }, { status: 400 })
    }

    // Save the data URL directly to the user's image field
    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { image },
      select: { id: true, name: true, email: true, image: true }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_AVATAR',
        entity: 'User',
        entityId: session.user.id,
        after: JSON.stringify({ image: 'updated' })
      }
    })

    return NextResponse.json({ image: updated.image })
  } catch (error) {
    console.error('Avatar upload error:', error)
    return NextResponse.json({ error: 'Failed to update profile picture' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Failed to remove profile picture' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, image: true, role: true }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Avatar get error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}
