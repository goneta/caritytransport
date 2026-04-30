-- CreateTable
CREATE TABLE "IncidentReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "incidentType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "actionTaken" TEXT,
    "parentVisible" BOOLEAN NOT NULL DEFAULT true,
    "parentNotified" BOOLEAN NOT NULL DEFAULT false,
    "parentNotificationSummary" TEXT,
    "tripLogId" TEXT,
    "scheduleId" TEXT,
    "pupilId" TEXT,
    "driverId" TEXT,
    "vehicleId" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "IncidentReport_tripLogId_fkey" FOREIGN KEY ("tripLogId") REFERENCES "TripLog" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_pupilId_fkey" FOREIGN KEY ("pupilId") REFERENCES "Pupil" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "IncidentReport_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentAttachment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "caption" TEXT,
    "uploadedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IncidentAttachment_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "IncidentReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "IncidentReport_reference_key" ON "IncidentReport"("reference");

-- CreateIndex
CREATE INDEX "IncidentReport_incidentType_createdAt_idx" ON "IncidentReport"("incidentType", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_severity_status_idx" ON "IncidentReport"("severity", "status");

-- CreateIndex
CREATE INDEX "IncidentReport_status_createdAt_idx" ON "IncidentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_scheduleId_createdAt_idx" ON "IncidentReport"("scheduleId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_pupilId_createdAt_idx" ON "IncidentReport"("pupilId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_driverId_createdAt_idx" ON "IncidentReport"("driverId", "createdAt");

-- CreateIndex
CREATE INDEX "IncidentReport_tripLogId_idx" ON "IncidentReport"("tripLogId");

-- CreateIndex
CREATE INDEX "IncidentAttachment_incidentId_createdAt_idx" ON "IncidentAttachment"("incidentId", "createdAt");
