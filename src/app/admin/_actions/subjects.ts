"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formObject, handleError, ok, parse, text } from "@/lib/action";
import type { ActionState } from "@/lib/action-state";

const subjectSchema = z.object({ name: text("Nama subjek", 80) });

export async function createSubject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(subjectSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    await prisma.subject.create({ data: { name: parsed.data.name } });
  } catch (e) {
    return handleError(e, "Subjek dengan nama ini sudah wujud.");
  }
  revalidatePath("/", "layout");
  return ok("Subjek telah ditambah.");
}

export async function renameSubject(subjectId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parse(subjectSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    await prisma.subject.update({ where: { id: subjectId }, data: { name: parsed.data.name } });
  } catch (e) {
    return handleError(e, "Subjek dengan nama ini sudah wujud.");
  }
  revalidatePath("/", "layout");
  return ok("Nama subjek telah dikemas kini.");
}

export async function setSubjectActive(subjectId: string, active: boolean): Promise<ActionState> {
  await requireAdmin();
  try {
    await prisma.subject.update({ where: { id: subjectId }, data: { isActive: active } });
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(active ? "Subjek diaktifkan." : "Subjek disembunyikan daripada pilihan baharu.");
}

export async function deleteSubject(subjectId: string): Promise<ActionState> {
  await requireAdmin();
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
    await prisma.$transaction([
      prisma.studentSubject.deleteMany({ where: { subjectId } }),
      prisma.subject.delete({ where: { id: subjectId } }),
    ]);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Subjek telah dipadam.");
}
