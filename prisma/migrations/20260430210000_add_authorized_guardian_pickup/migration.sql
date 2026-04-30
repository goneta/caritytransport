-- Add authorized guardian pickup verification
CREATE TABLE "AuthorizedGuardian" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "parentId" TEXT NOT NULL,
  "pupilId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "pinHash" TEXT NOT NULL,
  "qrCodeData" TEXT,
  "validFrom" DATETIME,
  "validUntil" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "AuthorizedGuardian_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AuthorizedGuardian_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PickupVerification" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "guardianId" TEXT NOT NULL,
  "pupilId" TEXT NOT NULL,
  "scheduleId" TEXT,
  "driverId" TEXT,
  "tripLogId" TEXT,
  "method" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'VERIFIED',
  "notes" TEXT,
  "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PickupVerification_guardianId_fkey" FOREIGN KEY ("guardianId") REFERENCES "AuthorizedGuardian" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PickupVerification_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PickupVerification_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PickupVerification_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "PickupVerification_tripLogId_fkey" FOREIGN KEY ("tripLogId") REFERENCES "TripLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AuthorizedGuardian_parentId_idx" ON "AuthorizedGuardian"("parentId");
CREATE INDEX "AuthorizedGuardian_pupilId_status_idx" ON "AuthorizedGuardian"("pupilId", "status");
CREATE INDEX "PickupVerification_guardianId_verifiedAt_idx" ON "PickupVerification"("guardianId", "verifiedAt");
CREATE INDEX "PickupVerification_pupilId_verifiedAt_idx" ON "PickupVerification"("pupilId", "verifiedAt");
CREATE INDEX "PickupVerification_scheduleId_verifiedAt_idx" ON "PickupVerification"("scheduleId", "verifiedAt");
CREATE INDEX "PickupVerification_driverId_verifiedAt_idx" ON "PickupVerification"("driverId", "verifiedAt");
