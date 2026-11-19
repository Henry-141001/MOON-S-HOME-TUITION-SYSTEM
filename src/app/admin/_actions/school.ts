"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formObject, handleError, ok, parse, text } from "@/lib/action";
import { parseISODate } from "@/lib/dates";
import { DUPLICATE_SCHOOL_EXAM, parseSchoolExamForm } from "@/lib/school-form";
import { schoolExamTitle } from "@/lib/records";
import { adminActor, logActivity, studentLabel } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

/** "UASA — Ahmad (STU005)" plus the student id, for activity log entries. */
async function describeExam(examId: string) {
  const e = await prisma.schoolExamination.findUnique({
    where: { id: examId },
    select: { examType: true, examName: true, studentId: true },
  });
  if (!e) return { text: "keputusan sekolah", studentId: null };
  return { text: `${schoolExamTitle(e.examType, e.examName)} — ${await studentLabel(e.studentId)}`, studentId: e.studentId };
}

/** Admin corrects a parent's submission. Status is kept unless the admin approves separately. */
export async function adminUpdateSchoolExam(examId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = await parseSchoolExamForm(formData);
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    await prisma.$transaction([
      prisma.schoolExamination.update({
        where: { id: examId },
        data: { examType: d.examType, examName: d.examName, examDate: parseISODate(d.examDate), remarks: d.remarks },
      }),
      prisma.schoolResult.deleteMany({ where: { examId } }),
      prisma.schoolResult.createMany({ data: d.rows.map((r) => ({ ...r, examId })) }),
    ]);
    const ex = await describeExam(examId);
    await logActivity(adminActor(admin), "school.edit", `Membetulkan markah keputusan sekolah: ${ex.text}`, ex.studentId);
  } catch (e) {
    return handleError(e, DUPLICATE_SCHOOL_EXAM);
  }
  revalidatePath("/", "layout");
  return ok("Keputusan telah dikemas kini.");
}

export async function approveSchoolExam(examId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    await prisma.schoolExamination.update({
      where: { id: examId },
      data: { status: "APPROVED", adminNote: null, reviewedById: admin.id, reviewedAt: new Date() },
    });
    const ex = await describeExam(examId);
    await logActivity(adminActor(admin), "school.approve", `Meluluskan keputusan sekolah: ${ex.text}`, ex.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Keputusan telah diluluskan.");
}

const correctionSchema = z.object({ adminNote: text("Catatan pembetulan", 500) });

export async function requestSchoolCorrection(examId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(correctionSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    await prisma.schoolExamination.update({
      where: { id: examId },
      data: { status: "NEEDS_CORRECTION", adminNote: parsed.data.adminNote, reviewedById: admin.id, reviewedAt: new Date() },
    });
    const ex = await describeExam(examId);
    await logActivity(adminActor(admin), "school.correction", `Meminta pembetulan keputusan sekolah: ${ex.text}`, ex.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Permintaan pembetulan telah dihantar kepada ibu bapa.");
}

export async function setSchoolExamPending(examId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    await prisma.schoolExamination.update({ where: { id: examId }, data: { status: "PENDING", reviewedAt: null } });
    const ex = await describeExam(examId);
    await logActivity(adminActor(admin), "school.pending", `Menukar status kepada Menunggu Semakan: ${ex.text}`, ex.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Status ditukar kepada Menunggu Semakan.");
}

export async function adminDeleteSchoolExam(examId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const ex = await describeExam(examId);
    await prisma.schoolExamination.delete({ where: { id: examId } });
    await logActivity(adminActor(admin), "school.delete", `Memadam keputusan sekolah: ${ex.text}`, ex.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect("/admin/keputusan-sekolah");
}
