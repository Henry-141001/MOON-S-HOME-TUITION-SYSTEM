"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { assertParentOwnsStudent, requireParent } from "@/lib/session";
import { fail, handleError, ok } from "@/lib/action";
import { parseISODate } from "@/lib/dates";
import { DUPLICATE_SCHOOL_EXAM, parseSchoolExamForm } from "@/lib/school-form";
import { logActivity, parentActor, studentLabel } from "@/lib/activity";
import { schoolExamTitle } from "@/lib/records";
import { deleteStudentPhoto, saveStudentPhoto } from "@/lib/photos";
import type { ActionState } from "@/lib/action-state";

/**
 * Parents may only touch SCHOOL examination results (while not yet approved)
 * and their own child's profile photo — always only for their own children.
 * Tuition marks, attendance and teacher comments have no parent actions at all.
 */

export async function uploadChildPhoto(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  try {
    await assertParentOwnsStudent(parent.id, studentId);
    const problem = await saveStudentPhoto(studentId, formData.get("photo"));
    if (problem) return fail(problem);
    await logActivity(parentActor(parent), "student.photo", `Memuat naik gambar profil ${await studentLabel(studentId)}`, studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar profil telah dikemas kini.");
}

export async function removeChildPhoto(studentId: string): Promise<ActionState> {
  const parent = await requireParent();
  try {
    await assertParentOwnsStudent(parent.id, studentId);
    await deleteStudentPhoto(studentId);
    await logActivity(parentActor(parent), "student.photo", `Membuang gambar profil ${await studentLabel(studentId)}`, studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar telah dibuang.");
}

async function ownedEditableExam(parentId: string, examId: string) {
  const exam = await prisma.schoolExamination.findUnique({
    where: { id: examId },
    select: { id: true, studentId: true, status: true },
  });
  if (!exam) return { error: fail("Rekod tidak dijumpai.") };
  await assertParentOwnsStudent(parentId, exam.studentId);
  if (exam.status === "APPROVED") {
    return { error: fail("Keputusan ini telah diluluskan oleh guru dan tidak boleh diubah. Sila hubungi guru jika ada kesilapan.") };
  }
  return { exam };
}

export async function submitSchoolExam(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  try {
    await assertParentOwnsStudent(parent.id, studentId);
    const parsed = await parseSchoolExamForm(formData);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    await prisma.schoolExamination.create({
      data: {
        studentId,
        submittedById: parent.id,
        examType: d.examType,
        examName: d.examName,
        examDate: parseISODate(d.examDate),
        remarks: d.remarks,
        status: "PENDING",
        results: { create: d.rows },
      },
    });
    await logActivity(
      parentActor(parent),
      "school.submit",
      `Menghantar keputusan sekolah: ${schoolExamTitle(d.examType, d.examName)} (${d.rows.length} subjek) — ${await studentLabel(studentId)}`,
      studentId,
    );
  } catch (e) {
    return handleError(e, DUPLICATE_SCHOOL_EXAM);
  }
  revalidatePath("/", "layout");
  return ok("Terima kasih! Keputusan telah dihantar dan sedang menunggu semakan guru.");
}

export async function updateOwnSchoolExam(examId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  try {
    const owned = await ownedEditableExam(parent.id, examId);
    if (owned.error) return owned.error;
    const parsed = await parseSchoolExamForm(formData);
    if (parsed.error) return parsed.error;
    const d = parsed.data;
    await prisma.$transaction([
      prisma.schoolExamination.update({
        where: { id: examId },
        data: {
          examType: d.examType,
          examName: d.examName,
          examDate: parseISODate(d.examDate),
          remarks: d.remarks,
          status: "PENDING", // re-checked by the teacher after every change
          adminNote: null,
          reviewedAt: null,
        },
      }),
      prisma.schoolResult.deleteMany({ where: { examId } }),
      prisma.schoolResult.createMany({ data: d.rows.map((r) => ({ ...r, examId })) }),
    ]);
    await logActivity(
      parentActor(parent),
      "school.edit",
      `Mengemas kini keputusan sekolah: ${schoolExamTitle(d.examType, d.examName)} — ${await studentLabel(owned.exam.studentId)}`,
      owned.exam.studentId,
    );
  } catch (e) {
    return handleError(e, DUPLICATE_SCHOOL_EXAM);
  }
  revalidatePath("/", "layout");
  return ok("Keputusan telah dikemas kini dan dihantar semula untuk semakan.");
}

export async function deleteOwnSchoolExam(examId: string): Promise<ActionState> {
  const parent = await requireParent();
  try {
    const owned = await ownedEditableExam(parent.id, examId);
    if (owned.error) return owned.error;
    const removed = await prisma.schoolExamination.delete({ where: { id: examId }, select: { examType: true, examName: true } });
    await logActivity(
      parentActor(parent),
      "school.delete",
      `Memadam keputusan sekolah: ${schoolExamTitle(removed.examType, removed.examName)} — ${await studentLabel(owned.exam.studentId)}`,
      owned.exam.studentId,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Rekod telah dipadam.");
}
