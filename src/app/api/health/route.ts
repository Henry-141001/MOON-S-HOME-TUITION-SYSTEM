import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/health — confirms the app can reach the Neon database.
export async function GET() {
  // Always run at request time (never prerendered at build time).
  await connection();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    return Response.json({ status: "error", database: "unreachable" }, { status: 500 });
  }
}
