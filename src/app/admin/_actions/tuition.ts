"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, isoDate, ok, optionalText, parse, text } from "@/lib/action";
import { formatDate, parseISODate } from "@/lib/dates";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

// Marks are entered as percentages, so every test is out of 100.
const PERCENT_TOTAL = 100;

const examSchema = z.object({
  name: text("Nama ujian", 120),
  subjectId: text("Subjek", 50),
  date: isoDate("Tarikh ujian"),
  remarks: optionalText(500),
});

export async function createTuitionExam(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(examSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  let examId: string;
  try {
    const subject = await prisma.subject.findUnique({ where: { id: d.subjectId }, select: { id: true } });
    if (!subject) return fail("Subjek tidak dijumpai.", { subjectId: "Sila pilih subjek." });
    const exam = await prisma.tuitionExamination.create({
      data: { ...d, totalMarks: PERCENT_TOTAL, date: parseISODate(d.date), createdById: admin.id },
    });
    examId = exam.id;
    await logActivity(adminActor(admin), "tuition.exam.create", `Mencipta ujian tuisyen "${d.name}" (${formatDate(d.date)})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect(`/admin/markah-tuisyen/${examId}`);
}

export async function updateTuitionExam(examId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(examSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    await prisma.tuitionExamination.update({ where: { id: examId }, data: { ...d, date: parseISODate(d.date) } });
    await logActivity(adminActor(admin), "tuition.exam.update", `Mengemas kini ujian tuisyen "${d.name}" (${formatDate(d.date)})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Maklumat ujian telah dikemas kini.");
}

export async function deleteTuitionExam(examId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const exam = await prisma.tuitionExamination.delete({ where: { id: examId }, select: { name: true, date: true } });
    await logActivity(adminActor(admin), "tuition.exam.delete", `Memadam ujian tuisyen "${exam.name}" (${formatDate(exam.date)}) berserta markahnya`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  redirect("/admin/markah-tuisyen");
}

/**
 * Saves marks for every student listed. Fields: studentIds, marks_<id>, remarks_<id>.
 * An empty mark removes that student's result for this test.
 */
export async function saveTuitionResults(examId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const exam = await prisma.tuitionExamination.findUnique({ where: { id: examId }, select: { totalMarks: true, name: true, date: true } });
  if (!exam) return fail("Ujian tidak dijumpai.");

  const studentIds = [...new Set(formData.getAll("studentIds").map(String))];
  const valid = new Set(
    (await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true } })).map((s) => s.id),
  );

  const fieldErrors: Record<string, string> = {};
  const upserts: { studentId: string; marksObtained: number; remarks: string | null }[] = [];
  const clears: string[] = [];
  for (const studentId of studentIds) {
    if (!valid.has(studentId)) continue;
    const raw = String(formData.get(`marks_${studentId}`) ?? "").trim();
    const remarks = String(formData.get(`remarks_${studentId}`) ?? "").trim().slice(0, 300) || null;
    if (raw === "") {
      clears.push(studentId);
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) fieldErrors[`marks_${studentId}`] = "Markah tidak sah.";
    else if (value > exam.totalMarks) fieldErrors[`marks_${studentId}`] = `Maksimum ${exam.totalMarks}%.`;
    else upserts.push({ studentId, marksObtained: value, remarks });
  }
  if (Object.keys(fieldErrors).length) return fail("Sila betulkan markah yang ditanda.", fieldErrors);

  try {
    await prisma.$transaction([
      ...upserts.map((u) =>
        prisma.tuitionResult.upsert({
          where: { examId_studentId: { examId, studentId: u.studentId } },
          create: { examId, ...u },
          update: { marksObtained: u.marksObtained, remarks: u.remarks },
        }),
      ),
      prisma.tuitionResult.deleteMany({ where: { examId, studentId: { in: clears } } }),
    ]);
  } catch (e) {
    return handleError(e);
  }
  await logActivity(
    adminActor(admin),
    "tuition.marks.save",
    `Menyimpan markah ujian "${exam.name}" (${formatDate(exam.date)}) untuk ${upserts.length} murid`,
  );
  revalidatePath("/", "layout");
  return ok(`Markah disimpan untuk ${upserts.length} murid.`);
}
