"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clientIpHash, createSession, destroySession } from "@/lib/session";
import { isRateLimited, recordAttempt, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";
import { normaliseCode, verifySecret } from "@/lib/security";
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
  if (!admin || !valid) return fail("ID Admin atau kata laluan tidak betul.");

  await createSession("ADMIN", admin.id);
  redirect("/admin");
}

export async function parentLogin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parentCode = normaliseCode(String(formData.get("parentCode") ?? ""));
  const pin = String(formData.get("pin") ?? "").trim();
  if (!parentCode) return fail("Sila masukkan ID Ibu Bapa anda.");

  const ip = await clientIpHash();
  if (await isRateLimited(ip, "PARENT")) return fail(RATE_LIMIT_MESSAGE);

  const parent = await prisma.parent.findUnique({ where: { parentCode } });
  if (!parent || !parent.isActive) {
    await recordAttempt(ip, "PARENT", false);
    return fail("ID Ibu Bapa tidak sah atau akaun tidak aktif. Sila hubungi guru tuisyen.");
  }

  // Optional PIN upgrade: only asked for when the admin has set a PIN for this family.
  if (parent.pinHash) {
    if (!pin) return { status: "idle", needPin: true, message: "Sila masukkan PIN anda.", at: Date.now() };
    const pinOk = await verifySecret(pin, parent.pinHash);
    await recordAttempt(ip, "PARENT", pinOk);
    if (!pinOk) return { status: "error", needPin: true, message: "PIN tidak betul.", at: Date.now() };
  } else {
    await recordAttempt(ip, "PARENT", true);
  }

  await createSession("PARENT", parent.id);
  redirect("/ibu-bapa");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
