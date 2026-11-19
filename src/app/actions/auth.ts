"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientIpHash, createSession, destroySession, getSession } from "@/lib/session";
import { isRateLimited, recordAttempt, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { normaliseCode, verifySecret } from "@/lib/security";
import { adminActor, logActivity, maskCode, parentActor } from "@/lib/activity";
import { fail } from "@/lib/action";
import type { ActionState } from "@/lib/action-state";

export async function adminLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const loginId = normaliseCode(String(formData.get("loginId") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) return fail("Sila masukkan ID Admin dan kata laluan.");

  const ip = await clientIpHash();
  if (await isRateLimited(ip, "ADMIN")) return fail(RATE_LIMIT_MESSAGE);

  const admin = await prisma.admin.findUnique({ where: { loginId } });
  const valid = admin ? await verifySecret(password, admin.passwordHash) : false;
  await recordAttempt(ip, "ADMIN", valid);
  if (!admin || !valid) {
    await logActivity({ role: null, id: null, name: "Tidak dikenali" }, "login.failed", `Cubaan log masuk admin gagal (ID: ${maskCode(loginId)})`);
    return fail("ID Admin atau kata laluan tidak betul.");
  }

  await createSession("ADMIN", admin.id);
  await logActivity(adminActor(admin), "login", "Log masuk sebagai admin");
  redirect("/admin");
}

/**
 * The single "ID Ibu Bapa" field. A super admin access code opens the read-only
 * observer view; any other code is treated as a normal Parent ID.
 */
export async function parentLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = normaliseCode(String(formData.get("parentCode") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  if (!code) return fail("Sila masukkan ID Ibu Bapa anda.");

  const ip = await clientIpHash();
  if (await isRateLimited(ip, "PARENT")) return fail(RATE_LIMIT_MESSAGE);

  // 1) Super admin (observer)
  const superAdmin = await prisma.superAdmin.findUnique({ where: { accessCode: code } });
  if (superAdmin?.isActive) {
    if (superAdmin.pinHash) {
      if (!pin) return { status: "idle", needPin: true, message: "Sila masukkan PIN anda.", at: Date.now() };
      const pinOk = await verifySecret(pin, superAdmin.pinHash);
      await recordAttempt(ip, "PARENT", pinOk);
      if (!pinOk) return { status: "error", needPin: true, message: "PIN tidak betul.", at: Date.now() };
    } else {
      await recordAttempt(ip, "PARENT", true);
    }
    await createSession("SUPER_ADMIN", superAdmin.id);
    await logActivity({ role: "SUPER_ADMIN", id: superAdmin.id, name: superAdmin.name }, "login", "Log masuk sebagai pemerhati");
    redirect("/admin");
  }

  // 2) Normal parent
  const parent = await prisma.parent.findUnique({ where: { parentCode: code } });
  if (!parent || !parent.isActive) {
    await recordAttempt(ip, "PARENT", false);
    await logActivity(
      { role: null, id: null, name: "Tidak dikenali" },
      "login.failed",
      `Cubaan log masuk ibu bapa gagal (ID: ${maskCode(code)})`,
    );
    return fail("ID Ibu Bapa tidak sah atau akaun tidak aktif. Sila hubungi guru tuisyen.");
  }

  // Optional PIN upgrade: only asked for when the admin has set a PIN for this family.
  if (parent.pinHash) {
    if (!pin) return { status: "idle", needPin: true, message: "Sila masukkan PIN anda.", at: Date.now() };
    const pinOk = await verifySecret(pin, parent.pinHash);
    await recordAttempt(ip, "PARENT", pinOk);
    if (!pinOk) {
      await logActivity(parentActor(parent), "login.failed", "PIN salah semasa log masuk");
      return { status: "error", needPin: true, message: "PIN tidak betul.", at: Date.now() };
    }
  } else {
    await recordAttempt(ip, "PARENT", true);
  }

  await createSession("PARENT", parent.id);
  await logActivity(parentActor(parent), "login", "Log masuk ke portal ibu bapa");
  redirect("/ibu-bapa");
}

export async function logout() {
  const session = await getSession();
  if (session?.role === "ADMIN") await logActivity(adminActor(session.admin), "logout", "Log keluar");
  if (session?.role === "PARENT") await logActivity(parentActor(session.parent), "logout", "Log keluar");
  if (session?.role === "SUPER_ADMIN") {
    await logActivity({ role: "SUPER_ADMIN", id: session.superAdmin.id, name: session.superAdmin.name }, "logout", "Log keluar");
  }
  await destroySession();
  redirect("/");
}
