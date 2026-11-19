import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/lib/security";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "mht_session";
const ADMIN_SESSION_DAYS = 7;
const PARENT_SESSION_DAYS = 30;

export async function createSession(role: Role, accountId: string) {
  const token = randomToken();
  const days = role === "ADMIN" ? ADMIN_SESSION_DAYS : PARENT_SESSION_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      role,
      adminId: role === "ADMIN" ? accountId : null,
      parentId: role === "PARENT" ? accountId : null,
      expiresAt,
    },
  });

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  // Opportunistic cleanup of expired sessions and old login attempts.
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: weekAgo } } }),
  ]);
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  store.delete(SESSION_COOKIE);
}

type AdminSession = {
  role: "ADMIN";
  sessionId: string;
  admin: { id: string; loginId: string; name: string };
};
type ParentSession = {
  role: "PARENT";
  sessionId: string;
  parent: { id: string; parentCode: string; name: string };
};
export type CurrentSession = AdminSession | ParentSession;

/** Reads and validates the session cookie against the database. Cached per request. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      admin: { select: { id: true, loginId: true, name: true } },
      parent: { select: { id: true, parentCode: true, name: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  if (session.role === "ADMIN" && session.admin) {
    return { role: "ADMIN", sessionId: session.id, admin: session.admin };
  }
  if (session.role === "PARENT" && session.parent?.isActive) {
    const { id, parentCode, name } = session.parent;
    return { role: "PARENT", sessionId: session.id, parent: { id, parentCode, name } };
  }
  return null;
});

/** Call at the top of every admin page, server action and route handler. */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/?peranan=admin");
  return session.admin;
}

/** Call at the top of every parent page, server action and route handler. */
export async function requireParent() {
  const session = await getSession();
  if (!session || session.role !== "PARENT") redirect("/");
  return session.parent;
}

/** The active children linked to this parent — the ONLY students a parent may see. */
export const getParentChildren = cache(async (parentId: string) => {
  const links = await prisma.parentStudent.findMany({
    where: { parentId, student: { isActive: true } },
    include: {
      student: {
        select: {
          id: true,
          studentCode: true,
          fullName: true,
          school: true,
          yearForm: true,
          guardianName: true,
          registrationDate: true,
          isDemo: true,
          photo: { select: { updatedAt: true } },
          subjects: { select: { subject: { select: { id: true, name: true } } } },
        },
      },
    },
    orderBy: { student: { fullName: "asc" } },
  });
  return links.map((l) => l.student);
});

/**
 * Resolves which child a parent is viewing. Falls back to the first child and
 * never returns a student who does not belong to this parent.
 */
export async function resolveParentChild(parentId: string, requestedStudentId?: string | null) {
  const children = await getParentChildren(parentId);
  const current = children.find((c) => c.id === requestedStudentId) ?? children[0] ?? null;
  return { children, current };
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
  }
}

/** Throws if the student is not one of this parent's active children. */
export async function assertParentOwnsStudent(parentId: string, studentId: string) {
  const link = await prisma.parentStudent.findFirst({
    where: { parentId, studentId, student: { isActive: true } },
    select: { studentId: true },
  });
  if (!link) throw new ForbiddenError();
}

/** Hashed client IP for rate limiting (raw IPs are never stored). */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return sha256(`mht:${ip}`);
}
