"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireParentForSetup } from "@/lib/session";
import { fail, formObject, handleError, parse, text } from "@/lib/action";
import { CONSENT_STATEMENT } from "@/lib/constants";
import { logActivity, parentActor } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const PHONE_ERROR = "Nombor telefon tidak sah. Contoh: 012-345 6789";

const nameSchema = z.object({
  name: text("Nama penuh", 120)
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v.length >= 3, "Sila masukkan nama penuh anda."),
  phone: z.string().trim().max(30, PHONE_ERROR).optional(),
});

/** First login, step 1: the parent confirms their full name (and phone, if the teacher did not record one). */
export async function confirmParentName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireParentForSetup();
  const parsed = parse(nameSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const { name, phone } = parsed.data;
  try {
    const parent = await prisma.parent.findUniqueOrThrow({ where: { id: session.id }, select: { phone: true, consentAt: true } });
    if (parent.consentAt) redirect("/ibu-bapa");
    const needPhone = !parent.phone;
    if (needPhone && !phone) return fail("Sila masukkan nombor telefon anda.", { phone: "Nombor telefon diperlukan." });
    if (phone && !/^[0-9+\-\s()]{7,30}$/.test(phone)) return fail(PHONE_ERROR, { phone: PHONE_ERROR });
    await prisma.parent.update({
      where: { id: session.id },
      data: { name, nameConfirmedAt: new Date(), ...(needPhone ? { phone } : {}) },
    });
    await logActivity(parentActor({ ...session, name }), "parent.setup", "Mengemas kini nama semasa log masuk kali pertama");
  } catch (e) {
    return handleError(e);
  }
  // Show step 2 straight away (the page must not be served from the browser's cache).
  revalidatePath("/", "layout");
  redirect("/selamat-datang");
}

/** First login, step 2: the parent ticks the box and agrees. Saves a consent record. */
export async function giveConsent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireParentForSetup();
  if (formData.get("agree") !== "on") return fail("Sila tandakan kotak persetujuan untuk meneruskan.");
  try {
    const parent = await prisma.parent.findUniqueOrThrow({
      where: { id: session.id },
      select: { parentCode: true, name: true, phone: true, nameConfirmedAt: true, consentAt: true },
    });
    if (parent.consentAt) redirect("/ibu-bapa");
    if (!parent.nameConfirmedAt) redirect("/selamat-datang");
    const now = new Date();
    await prisma.$transaction([
      prisma.parentConsent.create({
        data: {
          parentId: session.id,
          parentCode: parent.parentCode,
          fullName: parent.name,
          phone: parent.phone,
          statement: CONSENT_STATEMENT,
          agreedAt: now,
        },
      }),
      prisma.parent.update({ where: { id: session.id }, data: { consentAt: now } }),
    ]);
    await logActivity(parentActor({ ...session, name: parent.name }), "parent.consent", "Bersetuju dengan Pengesahan & Persetujuan Ibu Bapa");
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect("/ibu-bapa");
}
