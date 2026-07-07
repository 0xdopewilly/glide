-- AlterTable: 6-digit transaction PIN (hashed) + lockout + verified-session on User
ALTER TABLE "User" ADD COLUMN "pinHash" TEXT;
ALTER TABLE "User" ADD COLUMN "pinSetAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "pinFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "pinLockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "pinVerifiedUntil" TIMESTAMP(3);
