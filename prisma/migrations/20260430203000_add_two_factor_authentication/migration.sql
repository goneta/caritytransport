-- Add optional two-factor authentication controls for admin and driver accounts.
ALTER TABLE "User" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorPendingSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorRecoveryCodes" TEXT;
ALTER TABLE "User" ADD COLUMN "twoFactorEnrolledAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "twoFactorLastUsedAt" DATETIME;

CREATE TABLE "SecurityPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
  "requireAdminTwoFactor" BOOLEAN NOT NULL DEFAULT false,
  "requireDriverTwoFactor" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "SecurityPolicy" ("id", "requireAdminTwoFactor", "requireDriverTwoFactor", "createdAt", "updatedAt")
VALUES ('global', false, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
