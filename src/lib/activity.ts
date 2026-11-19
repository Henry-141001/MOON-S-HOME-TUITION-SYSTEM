import "server-only";
import { prisma } from "@/lib/prisma";
import type { Role } from "@/generated/prisma/enums";

export type Actor = { role: Role | null; id: string | null; name: string };

export const adminActor = (admin: { id: string; name: string }): Actor => ({ role: "ADMIN", id: admin.id, name: admin.name });
export const parentActor = (parent: { id: string; name: string; parentCode?: string }): Actor => ({
  role: "PARENT",
  id: parent.id,
  name: parent.parentCode ? `${parent.name} (${parent.parentCode})` : parent.name,
});

/**
 * Records one entry in the activity log (seen only by the super admin).
 * Never throws: a logging problem must not block the user's actual work.
 */
export async function logActivity(actor: Actor, action: string, summary: string, studentId?: string | null) {
  try {
    await prisma.activityLog.create({
      data: {
        actorRole: actor.role,
        actorId: actor.id,
        actorName: actor.name.slice(0, 160),
        action,
        summary: summary.slice(0, 500),
        studentId: studentId ?? null,
      },
    });
  } catch (error) {
    console.error("activity log failed", error);
  }
}

/** Student name for log messages (falls back to the id). */
export async function studentLabel(studentId: string) {
  const s = await prisma.student.findUnique({ where: { id: studentId }, select: { fullName: true, studentCode: true } });
  return s ? `${s.fullName} (${s.studentCode})` : studentId;
}

/** Hides most of a typed code in the log, e.g. "MHT0****" — enough to spot patterns, useless to reuse. */
export function maskCode(code: string) {
  if (code.length <= 4) return "****";
  return `${code.slice(0, 4)}${"*".repeat(Math.min(8, code.length - 4))}`;
}
