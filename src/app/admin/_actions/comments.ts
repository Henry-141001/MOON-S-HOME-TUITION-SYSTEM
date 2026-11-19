"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { checkbox, fail, formObject, handleError, isoDate, ok, parse, text } from "@/lib/action";
import { COMMENT_CATEGORIES, COMMENT_LABELS } from "@/lib/constants";
import { parseISODate } from "@/lib/dates";
import { adminActor, logActivity, studentLabel } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const commentSchema = z.object({
  category: z.enum(COMMENT_CATEGORIES, { error: "Sila pilih kategori." }),
  content: text("Ulasan", 3000),
  commentDate: isoDate("Tarikh"),
  isPublished: checkbox,
});

export async function createComment(studentId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(commentSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return fail("Murid tidak dijumpai.");
    await prisma.teacherComment.create({
      data: { ...d, commentDate: parseISODate(d.commentDate), studentId, authorId: admin.id },
    });
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
    const c = await prisma.teacherComment.update({
      where: { id: commentId },
      data: { ...d, commentDate: parseISODate(d.commentDate) },
      select: { studentId: true },
    });
    await logActivity(adminActor(admin), "comment.update", `Mengemas kini ulasan untuk ${await studentLabel(c.studentId)}`, c.studentId);
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
