"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { checkbox, fail, formObject, handleError, isoDate, ok, parse, text } from "@/lib/action";
import { COMMENT_CATEGORIES, COMMENT_LABELS, REPLY_MAX } from "@/lib/constants";
import { parseISODate } from "@/lib/dates";
import { adminActor, logActivity, studentLabel } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const commentSchema = z.object({
  category: z.enum(COMMENT_CATEGORIES, { error: "Sila pilih kategori." }),
  content: text("Ulasan", 3000),
  commentDate: isoDate("Tarikh"),
  isPublished: checkbox,
  tuitionExamId: z.string().trim().optional(),
});

type CommentInput = z.infer<typeof commentSchema>;

const NEED_EXAM = "Sila pilih ujian yang diulas.";

/**
 * A "Keputusan Ujian" comment must point at a tuition test this student has a mark for.
 * Other categories never keep a test link. Returns the exam id to save, or an error.
 */
async function resolveExamLink(studentId: string, d: CommentInput): Promise<{ examId: string | null } | { error: ActionState }> {
  if (d.category !== "EXAM_RESULT") return { examId: null };
  if (!d.tuitionExamId) return { error: fail(NEED_EXAM, { tuitionExamId: NEED_EXAM }) };
  const result = await prisma.tuitionResult.findUnique({
    where: { examId_studentId: { examId: d.tuitionExamId, studentId } },
    select: { id: true },
  });
  if (!result) return { error: fail("Murid ini tiada markah untuk ujian tersebut.", { tuitionExamId: "Murid ini tiada markah untuk ujian tersebut." }) };
  return { examId: d.tuitionExamId };
}

function commentData(d: CommentInput, examId: string | null) {
  return {
    category: d.category,
    content: d.content,
    commentDate: parseISODate(d.commentDate),
    isPublished: d.isPublished,
    tuitionExamId: examId,
  };
}

export async function createComment(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(commentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return fail("Murid tidak dijumpai.");
    const link = await resolveExamLink(studentId, d);
    if ("error" in link) return link.error;
    await prisma.teacherComment.create({ data: { ...commentData(d, link.examId), studentId, authorId: admin.id } });
    await logActivity(
      adminActor(admin),
      "comment.create",
      `Menulis ulasan "${COMMENT_LABELS[d.category]}" untuk ${await studentLabel(studentId)}${d.isPublished ? "" : " (draf)"}`,
      studentId,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(d.isPublished ? "Ulasan telah diterbitkan kepada ibu bapa." : "Ulasan disimpan sebagai draf (tidak dipaparkan kepada ibu bapa).");
}

export async function updateComment(commentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(commentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const existing = await prisma.teacherComment.findUniqueOrThrow({ where: { id: commentId }, select: { studentId: true } });
    const link = await resolveExamLink(existing.studentId, d);
    if ("error" in link) return link.error;
    await prisma.teacherComment.update({ where: { id: commentId }, data: commentData(d, link.examId) });
    await logActivity(adminActor(admin), "comment.update", `Mengemas kini ulasan untuk ${await studentLabel(existing.studentId)}`, existing.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Ulasan telah dikemas kini.");
}

export async function deleteComment(commentId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const c = await prisma.teacherComment.delete({ where: { id: commentId }, select: { studentId: true } });
    await logActivity(adminActor(admin), "comment.delete", `Memadam ulasan untuk ${await studentLabel(c.studentId)}`, c.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Ulasan telah dipadam.");
}

export async function setCommentPublished(commentId: string, published: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const c = await prisma.teacherComment.update({ where: { id: commentId }, data: { isPublished: published }, select: { studentId: true } });
    await logActivity(
      adminActor(admin),
      "comment.publish",
      `${published ? "Menerbitkan" : "Menyembunyikan"} ulasan untuk ${await studentLabel(c.studentId)}`,
      c.studentId,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok(published ? "Ulasan diterbitkan." : "Ulasan disembunyikan daripada ibu bapa.");
}

// ───────── Conversation under a comment ─────────

const replySchema = z.object({ content: text("Balasan", REPLY_MAX) });

/** The teacher answers in the conversation under a comment. */
export async function adminReplyToComment(commentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(replySchema, formObject(formData));
  if (parsed.error) return parsed.error;
  try {
    const c = await prisma.teacherComment.findUnique({ where: { id: commentId }, select: { studentId: true } });
    if (!c) return fail("Ulasan tidak dijumpai. Ia mungkin telah dipadam.");
    await prisma.$transaction([
      prisma.commentReply.create({ data: { commentId, authorType: "ADMIN", adminId: admin.id, content: parsed.data.content } }),
      // Answering counts as having read the parent's messages in this conversation.
      prisma.commentReply.updateMany({ where: { commentId, authorType: "PARENT", readAt: null }, data: { readAt: new Date() } }),
    ]);
    await logActivity(adminActor(admin), "comment.reply", `Membalas perbualan ulasan untuk ${await studentLabel(c.studentId)}`, c.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Balasan dihantar.");
}

/** The teacher can remove any message in a conversation (e.g. something sent by mistake). */
export async function adminDeleteReply(replyId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const r = await prisma.commentReply.delete({ where: { id: replyId }, select: { comment: { select: { studentId: true } } } });
    await logActivity(adminActor(admin), "comment.reply", `Memadam satu balasan ulasan untuk ${await studentLabel(r.comment.studentId)}`, r.comment.studentId);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Balasan telah dipadam.");
}
