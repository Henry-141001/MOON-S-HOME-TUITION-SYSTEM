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

const NAME_LABEL = "Nama panggilan / samaran";

const nameSchema = z.object({
  name: text(NAME_LABEL, 120)
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v.length >= 2, `${NAME_LABEL} terlalu pendek.`),
});

/** First login, step 1: the parent sets the name they want to be called (Nama Panggilan / Samaran). */
export async function confirmParentName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireParentForSetup();
  const parsed = parse(nameSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const { name } = parsed.data;
  try {
    const parent = await prisma.parent.findUniqueOrThrow({ where: { id: session.id }, select: { consentAt: true } });
    if (parent.consentAt) redirect("/ibu-bapa");
    await prisma.parent.update({ where: { id: session.id }, data: { name, nameConfirmedAt: new Date() } });
    await logActivity(parentActor({ ...session, name }), "parent.setup", "Mengemas kini nama panggilan semasa log masuk kali pertama");
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
