-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amountLabel" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "status" TEXT,
    "circleTransactionId" TEXT,
    "txHash" TEXT,
    "explorerUrl" TEXT,
    "chain" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_circleTransactionId_key" ON "Transaction"("circleTransactionId");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_txHash_idx" ON "Transaction"("txHash");

-- Foreign key to "User" moved to 20250519000001_transaction_user_fk: this
-- migration sorts before init (which creates "User"), so adding it here broke
-- `migrate deploy` on an empty database.
