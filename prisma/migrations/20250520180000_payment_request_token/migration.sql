-- Add token to payment requests (USDC | EURC)
ALTER TABLE "PaymentRequest" ADD COLUMN "token" TEXT NOT NULL DEFAULT 'USDC';
