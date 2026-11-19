import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

const WINDOW_MINUTES = 15;
// Super admin codes are entered in the parent field, so they share the PARENT limit.
const MAX_FAILURES: Record<Role, number> = { ADMIN: 5, PARENT: 10, SUPER_ADMIN: 5 };

/** True when this IP has too many failed logins in the last 15 minutes. */
export async function isRateLimited(ipHash: string, kind: Role): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: { ipHash, kind, success: false, createdAt: { gte: since } },
  });
  return failures >= MAX_FAILURES[kind];
}

export async function recordAttempt(ipHash: string, kind: Role, success: boolean) {
  await prisma.loginAttempt.create({ data: { ipHash, kind, success } });
}

export const RATE_LIMIT_MESSAGE = `Terlalu banyak cubaan log masuk. Sila cuba lagi selepas ${WINDOW_MINUTES} minit.`;
