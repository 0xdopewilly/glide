-- AlterTable: dedicated Savings wallet on User (provisioned lazily on first auto-save rule)
ALTER TABLE "User" ADD COLUMN "savingsWalletId" TEXT;
ALTER TABLE "User" ADD COLUMN "savingsWalletAddress" TEXT;

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "percent" INTEGER,
    "token" TEXT NOT NULL DEFAULT 'USDC',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "amountLabel" TEXT,
    "sourceRef" TEXT,
    "resultTxId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_savingsWalletId_key" ON "User"("savingsWalletId");

-- CreateIndex
CREATE INDEX "AutomationRule_userId_active_idx" ON "AutomationRule"("userId", "active");

-- CreateIndex
CREATE INDEX "AutomationRule_userId_trigger_active_idx" ON "AutomationRule"("userId", "trigger", "active");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRun_ruleId_sourceRef_key" ON "AutomationRun"("ruleId", "sourceRef");

-- CreateIndex
CREATE INDEX "AutomationRun_userId_createdAt_idx" ON "AutomationRun"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
