import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomToken, sha256 } from "@/lib/security";
import type { Role } from "@/generated/prisma/enums";

export const SESSION_COOKIE = "mht_session";
const SESSION_DAYS: Record<Role, number> = { ADMIN: 7, PARENT: 30, SUPER_ADMIN: 1 };

export async function createSession(role: Role, accountId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS[role] * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      tokenHash: sha256(token),
      role,
      adminId: role === "ADMIN" ? accountId : null,
      parentId: role === "PARENT" ? accountId : null,
      superAdminId: role === "SUPER_ADMIN" ? accountId : null,
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

  // Opportunistic cleanup of expired sessions, old login attempts and very old activity.
  const now = Date.now();
  await Promise.all([
    prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * 864e5) } } }),
    prisma.activityLog.deleteMany({ where: { createdAt: { lt: new Date(now - 400 * 864e5) } } }),
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
  /** First-login steps (confirm name + agree to consent) are not finished yet. */
  needsSetup: boolean;
};
type SuperAdminSession = {
  role: "SUPER_ADMIN";
  sessionId: string;
  superAdmin: { id: string; name: string };
  observeParentId: string | null;
};
export type CurrentSession = AdminSession | ParentSession | SuperAdminSession;

/** Reads and validates the session cookie against the database. Cached per request. */
export const getSession = cache(async (): Promise<CurrentSession | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: {
      admin: { select: { id: true, loginId: true, name: true } },
      parent: { select: { id: true, parentCode: true, name: true, isActive: true, consentAt: true } },
      superAdmin: { select: { id: true, name: true, isActive: true } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  if (session.role === "ADMIN" && session.admin) {
    return { role: "ADMIN", sessionId: session.id, admin: session.admin };
  }
  if (session.role === "PARENT" && session.parent?.isActive) {
    const { id, parentCode, name, consentAt } = session.parent;
    return { role: "PARENT", sessionId: session.id, parent: { id, parentCode, name }, needsSetup: consentAt === null };
  }
  if (session.role === "SUPER_ADMIN" && session.superAdmin?.isActive) {
    const { id, name } = session.superAdmin;
    return { role: "SUPER_ADMIN", sessionId: session.id, superAdmin: { id, name }, observeParentId: session.observeParentId };
  }
  return null;
});

// ───────── Admin area ─────────

/**
 * WRITE access to admin data. Use in every admin server action.
 * The super admin (read-only) is sent back to the dashboard and nothing changes.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") redirect("/admin");
  if (!session || session.role !== "ADMIN") redirect("/?peranan=admin");
  return session.admin;
}

export type AdminViewer = {
  id: string;
  name: string;
  loginId: string;
  role: "ADMIN" | "SUPER_ADMIN";
  /** true for the super admin: show data, never allow changes */
  readOnly: boolean;
};

/** READ access to admin pages: the admin, or the super admin in read-only mode. */
export async function requireAdminView(): Promise<AdminViewer> {
  const session = await getSession();
  if (session?.role === "ADMIN") return { ...session.admin, role: "ADMIN", readOnly: false };
  if (session?.role === "SUPER_ADMIN") {
    return { id: session.superAdmin.id, name: session.superAdmin.name, loginId: "PEMERHATI", role: "SUPER_ADMIN", readOnly: true };
  }
  redirect("/?peranan=admin");
}

/** Pages and actions that only the super admin may use (activity log, observing parents). */
export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") redirect("/");
  return session;
}

// ───────── Parent area ─────────

/**
 * WRITE access as a parent. Use in every parent server action.
 * A super admin viewing a parent's portal is sent back and nothing changes.
 */
export async function requireParent() {
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") redirect("/ibu-bapa");
  if (!session || session.role !== "PARENT") redirect("/");
  if (session.needsSetup) redirect(PARENT_SETUP_PATH);
  return session.parent;
}

/** Where a parent finishes the first-login steps (name, then consent). */
export const PARENT_SETUP_PATH = "/selamat-datang";

/**
 * A logged-in parent who may still be on the first-login steps.
 * Only for the first-login page and its actions.
 */
export async function requireParentForSetup() {
  const session = await getSession();
  if (session?.role === "SUPER_ADMIN") redirect("/admin");
  if (!session || session.role !== "PARENT") redirect("/");
  return session.parent;
}

export type ParentViewer = {
  parent: { id: string; parentCode: string; name: string };
  /** true when the super admin is viewing this parent's portal */
  readOnly: boolean;
};

/** READ access to the parent portal: the parent, or the super admin viewing one parent. */
export const requireParentView = cache(async (): Promise<ParentViewer> => {
  const session = await getSession();
  if (session?.role === "PARENT") {
    if (session.needsSetup) redirect(PARENT_SETUP_PATH);
    return { parent: session.parent, readOnly: false };
  }
  if (session?.role === "SUPER_ADMIN") {
    if (!session.observeParentId) redirect("/admin/ibu-bapa");
    const parent = await prisma.parent.findUnique({
      where: { id: session.observeParentId },
      select: { id: true, parentCode: true, name: true },
    });
    if (!parent) redirect("/admin/ibu-bapa");
    return { parent, readOnly: true };
  }
  redirect("/");
});

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
 * Resolves which child is being viewed. Falls back to the first child and
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
