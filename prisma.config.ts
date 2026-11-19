import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI (migrations, studio) uses the DIRECT (non-pooled) Neon URL.
// The running app uses the pooled DATABASE_URL via the Neon adapter (src/lib/prisma.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
