import "server-only";
import { prisma } from "@/lib/prisma";
import { getStudentRecords } from "@/lib/records";
import { attendanceCounts, average, subjectPerformance } from "@/lib/analytics";

/**
 * Data for the parent-facing student report. Only APPROVED school results and
 * PUBLISHED teacher comments are included, since the report is shared with parents.
 * Caller must have checked requireAdmin().
 */
export async function buildStudentReport(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      subjects: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
      parents: { include: { parent: { select: { name: true, parentCode: true } } } },
      photo: { select: { updatedAt: true } },
    },
  });
  if (!student) return null;

  const [records, settings] = await Promise.all([
    getStudentRecords(studentId, { audience: "parent" }),
    prisma.appSetting.findUnique({ where: { id: 1 } }),
  ]);

  const school = records.school.filter((e) => e.status === "APPROVED");
  const schoolRows = school.flatMap((e) => e.results.map((r) => ({ subject: r.subject, date: e.date, percent: r.percent })));

  const strengths = records.comments.filter((c) => c.category === "STRENGTHS");
  const improvement = records.comments.filter((c) => c.category === "IMPROVEMENT");
  const recommendations = records.comments.filter((c) => c.category === "RECOMMENDATIONS");
  const otherComments = records.comments.filter((c) => !["STRENGTHS", "IMPROVEMENT", "RECOMMENDATIONS"].includes(c.category));

  // Latest comment per remaining category keeps the report concise.
  const latestOther = [...new Map(otherComments.map((c) => [c.category, c])).values()];

  // Automatic suggestions from the data, shown alongside the teacher's own recommendations.
  const autoNotes: string[] = [];
  const att = records.attendanceSummary;
  if (att.percent !== null && att.percent < 80) autoNotes.push(`Kehadiran ${att.percent}% — kehadiran yang lebih konsisten akan membantu prestasi.`);
  for (const s of records.tuitionBySubject) {
    if (s.average < 50) autoNotes.push(`${s.subject} (tuisyen): purata ${s.average}% — perlukan latihan tambahan.`);
    else if (s.change !== null && s.change <= -10) autoNotes.push(`${s.subject} (tuisyen): markah menurun ${Math.abs(s.change)}% berbanding ujian sebelumnya.`);
  }
  for (const s of subjectPerformance(schoolRows)) {
    if (s.average < 50) autoNotes.push(`${s.subject} (sekolah): purata ${s.average}% — beri perhatian lebih kepada subjek ini.`);
  }

  return {
    centre: {
      name: settings?.centreName ?? "Moons Home Tutor",
      phone: settings?.phone ?? null,
      address: settings?.address ?? null,
      note: settings?.reportNote ?? null,
    },
    student: {
      id: student.id,
      code: student.studentCode,
      name: student.fullName,
      school: student.school,
      yearForm: student.yearForm,
      guardian: student.guardianName,
      registrationDate: student.registrationDate,
      subjects: student.subjects.map((s) => s.subject.name),
      parentCodes: student.parents.map((p) => p.parent.parentCode),
      photoVersion: student.photo?.updatedAt ?? null,
    },
    attendance: att,
    attendanceMonthly: records.attendanceMonthly.slice(0, 6),
    attendanceRecent: attendanceCounts(records.attendance.slice(0, 20)),
    tuition: records.tuition.slice(0, 20),
    tuitionCount: records.tuition.length,
    tuitionBySubject: records.tuitionBySubject,
    tuitionOverall: records.tuitionOverall,
    school,
    schoolBySubject: subjectPerformance(schoolRows),
    schoolOverall: average(schoolRows.map((r) => r.percent)),
    comments: { strengths, improvement, recommendations, other: latestOther },
    autoNotes,
  };
}

export type StudentReport = NonNullable<Awaited<ReturnType<typeof buildStudentReport>>>;
