"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, ok, optionalText, parse, text } from "@/lib/action";
import { generateParentCode, regenerateParentCode } from "@/lib/codes";
import { hashSecret, normaliseCode } from "@/lib/security";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const parentCodeField = z
  .string()
  .trim()
  .transform((v) => normaliseCode(v))
  .refine((v) => v === "" || /^[A-Z0-9-]{4,20}$/.test(v), "ID Ibu Bapa hanya boleh mengandungi huruf, nombor dan '-' (4–20 aksara).");

const parentSchema = z.object({
  parentCode: parentCodeField.optional(),
  name: text("Nama ibu bapa/penjaga", 120),
  phone: z
    .string()
    .trim()
    .max(30, "Nombor telefon terlalu panjang.")
    .refine((v) => v === "" || /^[0-9+\-\s()]{7,30}$/.test(v), "Nombor telefon tidak sah.")
    .optional()
    .transform((v) => (v ? v : null)),
  notes: optionalText(1000),
});

async function childLinks(formData: FormData) {
  const ids = [...new Set(formData.getAll("childIds").map(String).filter(Boolean))];
  if (ids.length === 0) return [];
  const found = await prisma.student.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((s) => ({ studentId: s.id, relationship: String(formData.get(`rel_${s.id}`) ?? "") || null }));
}

export async function createParent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(parentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const parentCode = d.parentCode || (await generateParentCode());
    const links = await childLinks(formData);
    await prisma.parent.create({
      data: { parentCode, name: d.name, phone: d.phone, notes: d.notes, children: { create: links } },
    });
    await logActivity(adminActor(admin), "parent.create", `Mencipta akaun ibu bapa ${d.name} (${parentCode}), ${links.length} anak dipautkan`);
    revalidatePath("/", "layout");
    return ok(`Akaun ibu bapa telah dicipta. ID Ibu Bapa: ${parentCode}`);
  } catch (e) {
    return handleError(e, "ID Ibu Bapa ini sudah digunakan. Sila guna ID lain.");
  }
}

export async function updateParent(parentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(parentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  if (!d.parentCode) return fail("Sila semak semula maklumat.", { parentCode: "ID Ibu Bapa diperlukan." });
  try {
    const before = await prisma.parent.findUniqueOrThrow({ where: { id: parentId }, select: { parentCode: true } });
    const links = await childLinks(formData);
    await prisma.$transaction([
      prisma.parent.update({
        where: { id: parentId },
        data: { parentCode: d.parentCode, name: d.name, phone: d.phone, notes: d.notes },
      }),
      prisma.parentStudent.deleteMany({ where: { parentId } }),
      prisma.parentStudent.createMany({ data: links.map((l) => ({ ...l, parentId })) }),
      // Changing the ID signs the family out everywhere.
      ...(before.parentCode !== d.parentCode ? [prisma.session.deleteMany({ where: { parentId } })] : []),
    ]);
    await logActivity(
      adminActor(admin),
      "parent.update",
      `Mengemas kini akaun ibu bapa ${d.name} (${d.parentCode})${before.parentCode !== d.parentCode ? `, ID ditukar daripada ${before.parentCode}` : ""}`,
    );
  } catch (e) {
    return handleError(e, "ID Ibu Bapa ini sudah digunakan. Sila guna ID lain.");
  }
  revalidatePath("/", "layout");
  return ok("Akaun ibu bapa telah dikemas kini.");
}

export async function setParentActive(parentId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const [p] = await prisma.$transaction([
      prisma.parent.update({ where: { id: parentId }, data: { isActive: active }, select: { name: true, parentCode: true } }),
      ...(active ? [] : [prisma.session.deleteMany({ where: { parentId } })]),
    ]);
    await logActivity(
      adminActor(admin),
      active ? "parent.activate" : "parent.deactivate",
      `${active ? "Mengaktifkan semula" : "Menyahaktifkan"} akaun ibu bapa ${p.name} (${p.parentCode})`,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(active ? "Akaun telah diaktifkan semula." : "Akaun telah dinyahaktifkan. Ibu bapa ini tidak lagi boleh log masuk.");
}

export async function regenerateParentId(parentId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const parent = await prisma.parent.findUniqueOrThrow({ where: { id: parentId }, select: { parentCode: true, name: true } });
    const parentCode = await regenerateParentCode(parent.parentCode);
    await prisma.$transaction([
      prisma.parent.update({ where: { id: parentId }, data: { parentCode } }),
      prisma.session.deleteMany({ where: { parentId } }),
    ]);
    await logActivity(adminActor(admin), "parent.regenerate", `Menjana ID baharu untuk ${parent.name}: ${parent.parentCode} → ${parentCode}`);
    revalidatePath("/", "layout");
    return ok(`ID baharu: ${parentCode}. ID lama tidak lagi boleh digunakan.`);
  } catch (e) {
    return handleError(e);
  }
}

const pinSchema = z.object({
  pin: z.string().trim().regex(/^\d{4,8}$/, "PIN mesti 4 hingga 8 digit nombor."),
});

export async function setParentPin(parentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(pinSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    const [p] = await prisma.$transaction([
      prisma.parent.update({
        where: { id: parentId },
        data: { pinHash: await hashSecret(parsed.data.pin) },
        select: { name: true, parentCode: true },
      }),
      prisma.session.deleteMany({ where: { parentId } }),
    ]);
    await logActivity(adminActor(admin), "parent.pin", `Menetapkan PIN untuk ${p.name} (${p.parentCode})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("PIN telah ditetapkan. Ibu bapa perlu memasukkan PIN ini semasa log masuk.");
}

export async function removeParentPin(parentId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const p = await prisma.parent.update({ where: { id: parentId }, data: { pinHash: null }, select: { name: true, parentCode: true } });
    await logActivity(adminActor(admin), "parent.pin", `Membuang PIN untuk ${p.name} (${p.parentCode})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("PIN telah dibuang. Log masuk kini menggunakan ID Ibu Bapa sahaja.");
}

export async function deleteParent(parentId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const p = await prisma.parent.delete({ where: { id: parentId }, select: { name: true, parentCode: true } });
    await logActivity(adminActor(admin), "parent.delete", `Memadam akaun ibu bapa ${p.name} (${p.parentCode})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect("/admin/ibu-bapa");
}
