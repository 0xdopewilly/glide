-- AlterTable: schedule + threshold + send fields on AutomationRule
ALTER TABLE "AutomationRule" ADD COLUMN "amount" TEXT;
ALTER TABLE "AutomationRule" ADD COLUMN "destination" TEXT;
ALTER TABLE "AutomationRule" ADD COLUMN "recipientLabel" TEXT;
ALTER TABLE "AutomationRule" ADD COLUMN "frequency" TEXT;
ALTER TABLE "AutomationRule" ADD COLUMN "nextRunAt" TIMESTAMP(3);
ALTER TABLE "AutomationRule" ADD COLUMN "lastRunAt" TIMESTAMP(3);
ALTER TABLE "AutomationRule" ADD COLUMN "thresholdAmount" TEXT;

-- CreateIndex
CREATE INDEX "AutomationRule_trigger_active_nextRunAt_idx" ON "AutomationRule"("trigger", "active", "nextRunAt");

-- CreateTable
CREATE TABLE "ApprovalPolicy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoApproveUnder" TEXT,
    "requireForNewRecipient" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT,
    "action" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "destination" TEXT NOT NULL,
    "recipientLabel" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sourceRef" TEXT,
    "resultTxId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalPolicy_userId_key" ON "ApprovalPolicy"("userId");

-- CreateIndex
CREATE INDEX "PendingApproval_userId_status_createdAt_idx" ON "PendingApproval"("userId", "status", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ApprovalPolicy" ADD CONSTRAINT "ApprovalPolicy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingApproval" ADD CONSTRAINT "PendingApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
