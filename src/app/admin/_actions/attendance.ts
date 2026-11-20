"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, isoDate, ok, optionalText, parse, text } from "@/lib/action";
import { formatDate, isValidISODate, parseISODate } from "@/lib/dates";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";
import type { AttendanceStatus } from "@/generated/prisma/enums";

const STATUSES = new Set(["PRESENT", "ABSENT", "EXCUSED"]);

/**
 * Saves the whole attendance table for one date.
 * Fields per student: status_<id> (PRESENT | ABSENT | EXCUSED | "" = no record), note_<id>.
 */
export async function saveAttendance(date: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!isValidISODate(date)) return fail("Tarikh tidak sah.");

  const studentIds = [...new Set(formData.getAll("studentIds").map(String))];
  if (studentIds.length === 0) return fail("Tiada murid untuk direkod.");
  const valid = await prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true } });
  const validIds = new Set(valid.map((s) => s.id));

  const day = parseISODate(date);
  const upserts: { studentId: string; status: AttendanceStatus; note: string | null }[] = [];
  const clears: string[] = [];
  for (const studentId of studentIds) {
    if (!validIds.has(studentId)) continue;
    const status = String(formData.get(`status_${studentId}`) ?? "");
    const note = String(formData.get(`note_${studentId}`) ?? "").trim().slice(0, 300) || null;
    if (status === "") clears.push(studentId);
    else if (STATUSES.has(status)) upserts.push({ studentId, status: status as AttendanceStatus, note });
    else return fail("Status kehadiran tidak sah.");
  }

  try {
    await prisma.$transaction([
      ...upserts.map((u) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: u.studentId, date: day } },
          create: { studentId: u.studentId, date: day, status: u.status, note: u.note, recordedById: admin.id },
          update: { status: u.status, note: u.note, recordedById: admin.id },
        }),
      ),
      prisma.attendance.deleteMany({ where: { date: day, studentId: { in: clears } } }),
    ]);
  } catch (e) {
    return handleError(e);
  }
  const present = upserts.filter((u) => u.status === "PRESENT").length;
  await logActivity(
    adminActor(admin),
    "attendance.save",
    `Merekod kehadiran ${formatDate(date)}: ${present} hadir, ${upserts.length - present} tidak hadir/bersebab`,
  );
  revalidatePath("/", "layout");
  return ok(`Kehadiran disimpan: ${present} hadir, ${upserts.length - present} tidak hadir/bersebab.`);
}

// ───────── Tuition session schedule ─────────

const time = (label: string) => z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, `${label} tidak sah.`);

const sessionSchema = z
  .object({
    date: isoDate(),
    startTime: time("Masa mula"),
    endTime: time("Masa tamat"),
    title: text("Tajuk sesi", 120),
    notes: optionalText(500),
  })
  .refine((v) => v.endTime > v.startTime, { message: "Masa tamat mesti selepas masa mula.", path: ["endTime"] });

/** Ticked subjects (checkboxes named subjectIds), keeping only ones that exist. */
async function sessionSubjects(formData: FormData) {
  const ids = [...new Set(formData.getAll("subjectIds").map(String).filter(Boolean))];
  if (ids.length === 0) return [];
  return prisma.subject.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
}

const subjectsText = (subjects: { name: string }[]) => (subjects.length ? subjects.map((s) => s.name).join(", ") : "semua murid");

export async function createTuitionSession(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(sessionSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const subjects = await sessionSubjects(formData);
    await prisma.tuitionSession.create({
      data: { ...d, date: parseISODate(d.date), subjects: { create: subjects.map((s) => ({ subjectId: s.id })) } },
    });
    await logActivity(
      adminActor(admin),
      "session.create",
      `Menjadualkan sesi "${d.title}" pada ${formatDate(d.date)} ${d.startTime} (${subjectsText(subjects)})`,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Sesi tuisyen telah dijadualkan.");
}

export async function updateTuitionSession(sessionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(sessionSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const d = parsed.data;
  try {
    const subjects = await sessionSubjects(formData);
    await prisma.tuitionSession.update({
      where: { id: sessionId },
      data: {
        ...d,
        date: parseISODate(d.date),
        subjects: { deleteMany: {}, create: subjects.map((s) => ({ subjectId: s.id })) },
      },
    });
    await logActivity(
      adminActor(admin),
      "session.update",
      `Mengemas kini sesi "${d.title}" (${formatDate(d.date)}, ${subjectsText(subjects)})`,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Sesi tuisyen telah dikemas kini.");
}

export async function deleteTuitionSession(sessionId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const s = await prisma.tuitionSession.delete({ where: { id: sessionId }, select: { title: true, date: true } });
    await logActivity(adminActor(admin), "session.delete", `Memadam sesi "${s.title}" (${formatDate(s.date)})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Sesi telah dipadam.");
}
