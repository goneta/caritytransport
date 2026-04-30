-- Parent saved payment methods, automatic renewals, and temporary route-change requests

CREATE TABLE "SavedPaymentMethod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripePaymentMethodId" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedPaymentMethod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SavedPaymentMethod_stripePaymentMethodId_key" ON "SavedPaymentMethod"("stripePaymentMethodId");
CREATE INDEX "SavedPaymentMethod_userId_status_idx" ON "SavedPaymentMethod"("userId", "status");

CREATE TABLE "RecurringTransportPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pupilId" TEXT,
    "scheduleId" TEXT,
    "savedPaymentMethodId" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "renewalInterval" TEXT NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRenewalDate" DATETIME,
    "lastRenewedAt" DATETIME,
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RecurringTransportPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransportPlan_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransportPlan_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RecurringTransportPlan_savedPaymentMethodId_fkey" FOREIGN KEY ("savedPaymentMethodId") REFERENCES "SavedPaymentMethod" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RecurringTransportPlan_stripeSubscriptionId_key" ON "RecurringTransportPlan"("stripeSubscriptionId");
CREATE INDEX "RecurringTransportPlan_userId_status_idx" ON "RecurringTransportPlan"("userId", "status");
CREATE INDEX "RecurringTransportPlan_nextRenewalDate_idx" ON "RecurringTransportPlan"("nextRenewalDate");

CREATE TABLE "RouteChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "pupilId" TEXT NOT NULL,
    "currentScheduleId" TEXT,
    "requestedScheduleId" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RouteChangeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteChangeRequest_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RouteChangeRequest_currentScheduleId_fkey" FOREIGN KEY ("currentScheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RouteChangeRequest_requestedScheduleId_fkey" FOREIGN KEY ("requestedScheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RouteChangeRequest_userId_status_idx" ON "RouteChangeRequest"("userId", "status");
CREATE INDEX "RouteChangeRequest_pupilId_startDate_idx" ON "RouteChangeRequest"("pupilId", "startDate");
