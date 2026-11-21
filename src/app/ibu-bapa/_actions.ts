"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { assertParentOwnsStudent, requireParent } from "@/lib/session";
import { fail, formObject, handleError, ok, parse, text } from "@/lib/action";
import { REPLY_MAX } from "@/lib/constants";
import { parseISODate } from "@/lib/dates";
import { DUPLICATE_SCHOOL_EXAM, parseSchoolExamForm } from "@/lib/school-form";
import { logActivity, parentActor, studentLabel } from "@/lib/activity";
import { schoolExamTitle } from "@/lib/records";
import { deleteStudentPhoto, saveStudentPhoto } from "@/lib/photos";
import type { ActionState } from "@/lib/action-state";

/**
 * Parents may only touch SCHOOL examination results (while not yet approved),
 * their own child's profile photo, and reply under PUBLISHED teacher comments —
 * always only for their own children. Tuition marks, attendance and the teacher's
 * comments themselves can never be changed by a parent.
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

// ───────── Replying to the teacher's comments ─────────

const replySchema = z.object({ content: text("Balasan", REPLY_MAX) });

export async function parentReplyToComment(commentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const parent = await requireParent();
  const parsed = parse(replySchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    const c = await prisma.teacherComment.findUnique({ where: { id: commentId }, select: { studentId: true, isPublished: true } });
    // A hidden (draft) comment is treated exactly like a missing one.
    if (!c || !c.isPublished) return fail("Ulasan tidak dijumpai.");
    await assertParentOwnsStudent(parent.id, c.studentId);
    await prisma.$transaction([
      prisma.commentReply.create({ data: { commentId, authorType: "PARENT", parentId: parent.id, content: parsed.data.content } }),
      prisma.commentReply.updateMany({ where: { commentId, authorType: "ADMIN", readAt: null }, data: { readAt: new Date() } }),
    ]);
    await logActivity(parentActor(parent), "comment.reply", `Membalas ulasan guru untuk ${await studentLabel(c.studentId)}`, c.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Balasan anda telah dihantar kepada guru.");
}

/** A parent can take back their own message. */
export async function parentDeleteOwnReply(replyId: string): Promise<ActionState> {
  const parent = await requireParent();
  try {
    const r = await prisma.commentReply.findUnique({
      where: { id: replyId },
      select: { parentId: true, comment: { select: { studentId: true } } },
    });
    if (!r || r.parentId !== parent.id) return fail("Balasan tidak dijumpai.");
    await assertParentOwnsStudent(parent.id, r.comment.studentId);
    await prisma.commentReply.delete({ where: { id: replyId } });
    await logActivity(parentActor(parent), "comment.reply", `Memadam balasan sendiri (${await studentLabel(r.comment.studentId)})`, r.comment.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Balasan telah dipadam.");
}
