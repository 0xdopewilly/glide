-- Fix critical bug: circleTransactionId was globally unique, which caused
-- one user's sync to overwrite the OTHER user's activity row (since both
-- sides of a transfer share the same Circle transaction id).
-- Move the unique constraint to (userId, circleTransactionId).

-- Drop the old global unique constraint.
DROP INDEX IF EXISTS "Transaction_circleTransactionId_key";

-- Compound uniqueness: each user has at most ONE row per Circle tx.
CREATE UNIQUE INDEX "Transaction_userId_circleTransactionId_key"
  ON "Transaction"("userId", "circleTransactionId");

-- Plain lookup index — still useful for cross-user joins / debugging.
CREATE INDEX "Transaction_circleTransactionId_idx"
  ON "Transaction"("circleTransactionId");
