-- AlterTable
ALTER TABLE "PaymentRequest" ADD COLUMN "targetUserId" TEXT,
ADD COLUMN "requestFromEmail" TEXT,
ADD COLUMN "requestFromGlideTag" TEXT;
