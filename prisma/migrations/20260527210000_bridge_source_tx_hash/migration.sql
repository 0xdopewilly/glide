-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "bridgeSourceTxHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_bridgeSourceTxHash_key" ON "Transaction"("bridgeSourceTxHash");
