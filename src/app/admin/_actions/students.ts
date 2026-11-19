"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, isoDate, ok, optionalText, parse, text } from "@/lib/action";
import { parseISODate } from "@/lib/dates";
import { normaliseCode } from "@/lib/security";
import { nextStudentCode } from "@/lib/codes";
import type { ActionState } from "@/lib/action-state";

const studentSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .transform((v) => normaliseCode(v))
    .refine((v) => v === "" || /^[A-Z0-9-]{3,20}$/.test(v), "ID Murid hanya boleh mengandungi huruf, nombor dan '-' (3–20 aksara).")
    .optional(),
  fullName: text("Nama penuh", 120),
  school: text("Sekolah", 150),
  yearForm: text("Tahun/Tingkatan", 40),
  guardianName: text("Nama ibu bapa/penjaga", 120),
  registrationDate: isoDate("Tarikh pendaftaran"),
  notes: optionalText(1000),
  parentId: z.string().optional(),
  relationship: optionalText(40),
});

async function validSubjectIds(formData: FormData) {
  const ids = formData.getAll("subjectIds").map(String).filter(Boolean);
  if (ids.length === 0) return [];
  const found = await prisma.subject.findMany({ where: { id: { in: ids } }, select: { id: true } });
  return found.map((s) => s.id);
}

export async function createStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(studentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;

  let createdId: string;
  try {
    const subjectIds = await validSubjectIds(formData);
    const studentCode = d.studentCode || (await nextStudentCode());
    if (d.parentId) {
      const parent = await prisma.parent.findUnique({ where: { id: d.parentId }, select: { id: true } });
      if (!parent) return fail("Akaun ibu bapa yang dipilih tidak dijumpai.");
    }
    const student = await prisma.student.create({
      data: {
        studentCode,
        fullName: d.fullName,
        school: d.school,
        yearForm: d.yearForm,
        guardianName: d.guardianName,
        registrationDate: parseISODate(d.registrationDate),
        notes: d.notes,
        subjects: { create: subjectIds.map((subjectId) => ({ subjectId })) },
        parents: d.parentId ? { create: { parentId: d.parentId, relationship: d.relationship } } : undefined,
      },
    });
    createdId = student.id;
  } catch (e) {
    return handleError(e, "ID Murid ini sudah digunakan. Sila guna ID lain.");
  }
  revalidatePath("/", "layout");
  redirect(`/admin/murid/${createdId}`);
}

export async function updateStudent(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(studentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  if (!d.studentCode) return fail("Sila semak semula maklumat.", { studentCode: "ID Murid diperlukan." });

  try {
    const subjectIds = await validSubjectIds(formData);
    await prisma.$transaction([
      prisma.student.update({
        where: { id: studentId },
        data: {
          studentCode: d.studentCode,
          fullName: d.fullName,
          school: d.school,
          yearForm: d.yearForm,
          guardianName: d.guardianName,
          registrationDate: parseISODate(d.registrationDate),
          notes: d.notes,
        },
      }),
      prisma.studentSubject.deleteMany({ where: { studentId, subjectId: { notIn: subjectIds } } }),
      prisma.studentSubject.createMany({
        data: subjectIds.map((subjectId) => ({ studentId, subjectId })),
        skipDuplicates: true,
      }),
    ]);
  } catch (e) {
    return handleError(e, "ID Murid ini sudah digunakan. Sila guna ID lain.");
  }
  revalidatePath("/", "layout");
  return ok("Maklumat murid telah dikemas kini.");
}

export async function setStudentActive(studentId: string, active: boolean): Promise<ActionState> {
  await requireAdmin();
  try {
    await prisma.student.update({ where: { id: studentId }, data: { isActive: active } });
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(active ? "Murid telah diaktifkan semula." : "Murid telah dinyahaktifkan.");
}

export async function deleteStudent(studentId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await prisma.student.delete({ where: { id: studentId } });
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect("/admin/murid");
}

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function uploadStudentPhoto(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return fail("Sila pilih gambar.");
  if (!PHOTO_TYPES.includes(file.type)) return fail("Format gambar mesti JPG, PNG atau WEBP.");
  if (file.size > MAX_PHOTO_BYTES) return fail("Saiz gambar terlalu besar (maksimum 1.5MB).");

  try {
    const data = new Uint8Array(await file.arrayBuffer());
    await prisma.studentPhoto.upsert({
      where: { studentId },
      create: { studentId, data, mimeType: file.type },
      update: { data, mimeType: file.type },
    });
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar murid telah dikemas kini.");
}

export async function removeStudentPhoto(studentId: string): Promise<ActionState> {
  await requireAdmin();
  try {
    await prisma.studentPhoto.deleteMany({ where: { studentId } });
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar telah dibuang.");
}
