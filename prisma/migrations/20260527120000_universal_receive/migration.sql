-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "originChain" TEXT;

-- CreateTable
CREATE TABLE "WalletAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletAddress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_walletId_key" ON "WalletAddress"("walletId");

-- CreateIndex
CREATE INDEX "WalletAddress_address_idx" ON "WalletAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "WalletAddress_userId_chain_key" ON "WalletAddress"("userId", "chain");

-- AddForeignKey
ALTER TABLE "WalletAddress" ADD CONSTRAINT "WalletAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
