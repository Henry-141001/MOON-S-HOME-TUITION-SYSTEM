"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getSession } from "@/lib/session";
import { fail, formObject, handleError, ok, optionalText, parse, text } from "@/lib/action";
import { hashSecret, normaliseCode, verifySecret } from "@/lib/security";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Kata laluan semasa diperlukan."),
    newPassword: z
      .string()
      .min(10, "Kata laluan baharu mesti sekurang-kurangnya 10 aksara.")
      .max(128, "Kata laluan terlalu panjang.")
      .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Gunakan gabungan huruf dan nombor."),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Kata laluan tidak sepadan.", path: ["confirmPassword"] });

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(passwordSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    const record = await prisma.admin.findUniqueOrThrow({ where: { id: admin.id } });
    if (!(await verifySecret(parsed.data.currentPassword, record.passwordHash))) {
      return fail("Kata laluan semasa tidak betul.", { currentPassword: "Kata laluan semasa tidak betul." });
    }
    const currentSessionId = (await getSession())?.sessionId ?? "";
    await prisma.$transaction([
      prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashSecret(parsed.data.newPassword) } }),
      // Sign out every other admin session (e.g. another device).
      prisma.session.deleteMany({ where: { adminId: admin.id, id: { not: currentSessionId } } }),
    ]);
    await logActivity(adminActor(admin), "settings.password", "Menukar kata laluan admin");
  } catch (e) {
    return handleError(e);
  }
  return ok("Kata laluan telah ditukar. Sesi lain telah dilog keluar.");
}

const profileSchema = z.object({
  name: text("Nama", 80),
  loginId: z
    .string()
    .trim()
    .transform((v) => normaliseCode(v))
    .refine((v) => /^[A-Z0-9._-]{3,30}$/.test(v), "ID Admin mesti 3–30 aksara (huruf, nombor, . _ -)."),
});

export async function updateAdminProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(profileSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    await prisma.admin.update({ where: { id: admin.id }, data: parsed.data });
    await logActivity(adminActor({ id: admin.id, name: parsed.data.name }), "settings.profile", `Mengemas kini profil admin (ID: ${parsed.data.loginId})`);
  } catch (e) {
    return handleError(e, "ID Admin ini sudah digunakan.");
  }
  revalidatePath("/", "layout");
  return ok("Profil telah dikemas kini. Gunakan ID Admin baharu pada log masuk seterusnya.");
}

const centreSchema = z.object({
  centreName: text("Nama pusat tuisyen", 100),
  phone: optionalText(30),
  address: optionalText(300),
  reportNote: optionalText(500),
});

export async function updateCentreSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(centreSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    await prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1, ...parsed.data }, update: parsed.data });
    await logActivity(adminActor(admin), "settings.centre", "Mengemas kini maklumat pusat tuisyen");
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Maklumat pusat tuisyen telah disimpan.");
}

/** Removes every record flagged as demo (students cascade to their records). */
export async function deleteDemoData(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "PADAM") {
    return fail("Taip PADAM untuk mengesahkan.", { confirm: "Taip PADAM untuk mengesahkan." });
  }
  try {
    const [students, parents] = await prisma.$transaction([
      prisma.student.deleteMany({ where: { isDemo: true } }),
      prisma.parent.deleteMany({ where: { isDemo: true } }),
      prisma.tuitionExamination.deleteMany({ where: { isDemo: true } }),
      prisma.tuitionSession.deleteMany({ where: { isDemo: true } }),
    ]);
    await logActivity(adminActor(admin), "settings.demo", `Memadam data demo: ${students.count} murid, ${parents.count} akaun ibu bapa`);
    revalidatePath("/", "layout");
    return ok(`Data demo dipadam: ${students.count} murid dan ${parents.count} akaun ibu bapa.`);
  } catch (e) {
    return handleError(e);
  }
}
