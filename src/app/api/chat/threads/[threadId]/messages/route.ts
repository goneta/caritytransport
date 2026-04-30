import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { auth } from '@/lib/auth'
import {
  createDriverAutoReplies,
  createModerationLog,
  moderateChatMessage,
  userCanAccessThread,
} from '@/lib/moderated-chat'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { threadId } = await params
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const allowed = await userCanAccessThread(threadId, currentUser.id, currentUser.role)
    if (!allowed) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    const messages = await prisma.directMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    })

    await prisma.chatParticipant.updateMany({
      where: { threadId, userId: currentUser.id },
      data: { lastReadAt: new Date() },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Chat message list error:', error)
    return NextResponse.json({ error: 'Failed to load chat messages' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { threadId } = await params
    const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, role: true } })
    if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const allowed = await userCanAccessThread(threadId, currentUser.id, currentUser.role)
    if (!allowed) return NextResponse.json({ error: 'Thread not found' }, { status: 404 })

    const body = await request.json()
    const content = typeof body.content === 'string' ? body.content : ''
    const decision = moderateChatMessage(content)

    if (!decision.sanitizedContent) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }

    const message = await prisma.directMessage.create({
      data: {
        threadId,
        senderId: currentUser.id,
        content,
        sanitizedContent: decision.sanitizedContent,
        status: decision.status,
        moderationReason: decision.reason || null,
        moderatedAt: decision.status === 'VISIBLE' ? null : new Date(),
      },
      include: { sender: { select: { id: true, name: true, email: true, role: true } } },
    })

    await prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })

    if (decision.status !== 'VISIBLE') {
      await createModerationLog({
        threadId,
        messageId: message.id,
        actorId: currentUser.id,
        action: decision.status === 'BLOCKED' ? 'MESSAGE_BLOCKED' : 'MESSAGE_FLAGGED',
        reason: decision.reason,
        originalContent: content,
      })
    }

    const autoRepliesCreated = await createDriverAutoReplies(threadId, currentUser.id)
    if (autoRepliesCreated > 0) {
      await prisma.chatThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
    }

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'CHAT_MESSAGE_SENT',
        entity: 'DirectMessage',
        entityId: message.id,
        after: JSON.stringify({ threadId, status: decision.status, autoRepliesCreated }),
      },
    })

    return NextResponse.json({ message, autoRepliesCreated }, { status: 201 })
  } catch (error) {
    console.error('Chat message create error:', error)
    return NextResponse.json({ error: 'Failed to send chat message' }, { status: 500 })
  }
}
