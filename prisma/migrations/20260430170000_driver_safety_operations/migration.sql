-- Driver pre-trip checklist and emergency escalation workflows
CREATE TABLE "PreTripChecklist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "checklistItems" JSONB NOT NULL,
    "passengerCount" INTEGER NOT NULL,
    "endOfTripCompleted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "completedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PreTripChecklist_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreTripChecklist_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PreTripChecklist_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "EmergencyEscalation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "driverId" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "passengerCount" INTEGER NOT NULL,
    "routeContext" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "resolvedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmergencyEscalation_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmergencyEscalation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "TransportSchedule" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EmergencyEscalation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "PreTripChecklist_driverId_idx" ON "PreTripChecklist"("driverId");
CREATE INDEX "PreTripChecklist_scheduleId_idx" ON "PreTripChecklist"("scheduleId");
CREATE INDEX "PreTripChecklist_vehicleId_idx" ON "PreTripChecklist"("vehicleId");
CREATE INDEX "PreTripChecklist_createdAt_idx" ON "PreTripChecklist"("createdAt");
CREATE INDEX "EmergencyEscalation_driverId_idx" ON "EmergencyEscalation"("driverId");
CREATE INDEX "EmergencyEscalation_scheduleId_idx" ON "EmergencyEscalation"("scheduleId");
CREATE INDEX "EmergencyEscalation_vehicleId_idx" ON "EmergencyEscalation"("vehicleId");
CREATE INDEX "EmergencyEscalation_status_idx" ON "EmergencyEscalation"("status");
CREATE INDEX "EmergencyEscalation_createdAt_idx" ON "EmergencyEscalation"("createdAt");
