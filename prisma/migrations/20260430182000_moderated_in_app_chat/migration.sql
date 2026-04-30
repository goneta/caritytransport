-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL DEFAULT 'Transport conversation',
    "contextType" TEXT,
    "contextId" TEXT,
    "scheduleId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatThread_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "threadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "lastReadAt" DATETIME,
    "mutedAt" DATETIME,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("threadId", "userId"),
    CONSTRAINT "ChatParticipant_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sanitizedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VISIBLE',
    "moderationReason" TEXT,
    "moderatedById" TEXT,
    "moderatedAt" DATETIME,
    "driverAutoReply" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DirectMessage_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatModerationLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "messageId" TEXT,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "originalContent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatModerationLog_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatModerationLog_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "DirectMessage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ChatModerationLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ChatThread_createdById_createdAt_idx" ON "ChatThread"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "ChatThread_scheduleId_idx" ON "ChatThread"("scheduleId");

-- CreateIndex
CREATE INDEX "ChatThread_status_updatedAt_idx" ON "ChatThread"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_lastReadAt_idx" ON "ChatParticipant"("userId", "lastReadAt");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_createdAt_idx" ON "DirectMessage"("senderId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_status_createdAt_idx" ON "DirectMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatModerationLog_threadId_createdAt_idx" ON "ChatModerationLog"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "ChatModerationLog_messageId_idx" ON "ChatModerationLog"("messageId");

-- CreateIndex
CREATE INDEX "ChatModerationLog_actorId_createdAt_idx" ON "ChatModerationLog"("actorId", "createdAt");
