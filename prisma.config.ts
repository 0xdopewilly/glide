import path from "node:path";
import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI reads .env by default; load .env.local for Next-style local secrets.
config({ path: path.resolve(".env") });
config({ path: path.resolve(".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
