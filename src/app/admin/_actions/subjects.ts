"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, ok, parse, text } from "@/lib/action";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

// Extra spaces are collapsed so "Sains  Tambahan" and "Sains Tambahan" count as the same name.
const subjectSchema = z.object({ name: text("Nama subjek", 80).transform((v) => v.replace(/\s+/g, " ")) });

const DUPLICATE_SUBJECT = "Subjek dengan nama ini sudah wujud.";

/** True if another subject already has this name, ignoring capital letters. */
async function nameTaken(name: string, exceptId?: string) {
  const found = await prisma.subject.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(exceptId ? { id: { not: exceptId } } : {}) },
    select: { id: true },
  });
  return Boolean(found);
}

export async function createSubject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(subjectSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    if (await nameTaken(parsed.data.name)) return fail(DUPLICATE_SUBJECT, { name: DUPLICATE_SUBJECT });
    await prisma.subject.create({ data: { name: parsed.data.name } });
    await logActivity(adminActor(admin), "subject.create", `Menambah subjek ${parsed.data.name}`);
  } catch (e) {
    return handleError(e, "Subjek dengan nama ini sudah wujud.");
  }
  revalidatePath("/", "layout");
  return ok("Subjek telah ditambah.");
}

export async function renameSubject(subjectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(subjectSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    const before = await prisma.subject.findUniqueOrThrow({ where: { id: subjectId }, select: { name: true } });
    if (await nameTaken(parsed.data.name, subjectId)) return fail(DUPLICATE_SUBJECT, { name: DUPLICATE_SUBJECT });
    await prisma.subject.update({ where: { id: subjectId }, data: { name: parsed.data.name } });
    await logActivity(adminActor(admin), "subject.update", `Menamakan semula subjek ${before.name} → ${parsed.data.name}`);
  } catch (e) {
    return handleError(e, "Subjek dengan nama ini sudah wujud.");
  }
  revalidatePath("/", "layout");
  return ok("Nama subjek telah dikemas kini.");
}

export async function setSubjectActive(subjectId: string, active: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const s = await prisma.subject.update({ where: { id: subjectId }, data: { isActive: active }, select: { name: true } });
    await logActivity(adminActor(admin), "subject.update", `${active ? "Mengaktifkan" : "Menyahaktifkan"} subjek ${s.name}`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(active ? "Subjek diaktifkan." : "Subjek disembunyikan daripada pilihan baharu.");
}

export async function deleteSubject(subjectId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const [exams, school] = await Promise.all([
      prisma.tuitionExamination.count({ where: { subjectId } }),
      prisma.schoolResult.count({ where: { subjectId } }),
    ]);
    if (exams + school > 0) {
      return {
        status: "error",
        message: "Subjek ini mempunyai rekod markah dan tidak boleh dipadam. Nyahaktifkan sahaja.",
        at: Date.now(),
      };
    }
    const [, s] = await prisma.$transaction([
      prisma.studentSubject.deleteMany({ where: { subjectId } }),
      prisma.subject.delete({ where: { id: subjectId }, select: { name: true } }),
    ]);
    await logActivity(adminActor(admin), "subject.delete", `Memadam subjek ${s.name}`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Subjek telah dipadam.");
}
