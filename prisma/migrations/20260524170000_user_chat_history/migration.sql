-- Billy's chat history, synced across devices. Nullable for back-compat.
ALTER TABLE "User" ADD COLUMN "chatHistory" JSONB;
