import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client across hot reloads in development. The key includes a version:
// bump it after schema changes so a running dev server picks up the new client.
const CLIENT_KEY = "prisma_v2";
const globalForPrisma = globalThis as unknown as Record<string, PrismaClient | undefined>;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill in your Neon URLs.");
  }
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

export const prisma = globalForPrisma[CLIENT_KEY] ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma[CLIENT_KEY] = prisma;
