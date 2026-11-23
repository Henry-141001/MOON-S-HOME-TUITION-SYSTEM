import "server-only";
import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";
import { attendanceCounts, average, monthlyAttendance, percent, subjectPerformance, type ScoreRow } from "@/lib/analytics";
import { SCHOOL_EXAM_LABELS } from "@/lib/constants";
import type { CommentCategory, SchoolExamType, SubmissionStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Everything about one student's academic record, used by the admin profile,
 * the parent portal and the PDF report.
 *
 * Callers MUST authorise access to `studentId` first (requireAdmin, or
 * requireParent + resolveParentChild/assertParentOwnsStudent).
 */
export async function getStudentRecords(studentId: string, opts: { audience: "admin" | "parent" }) {
  const [attendance, tuition, school, comments] = await Promise.all([
    prisma.attendance.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
      select: { id: true, date: true, status: true, note: true },
    }),
    prisma.tuitionResult.findMany({
      where: { studentId },
      orderBy: { exam: { date: "desc" } },
      select: {
        id: true,
        marksObtained: true,
        remarks: true,
        exam: { select: { id: true, name: true, date: true, totalMarks: true, subject: { select: { name: true } } } },
      },
    }),
    prisma.schoolExamination.findMany({
      where: { studentId },
      orderBy: { examDate: "desc" },
      select: {
        id: true,
        examType: true,
        examName: true,
        examDate: true,
        remarks: true,
        status: true,
        adminNote: true,
        createdAt: true,
        updatedAt: true,
        results: {
          select: { id: true, marksObtained: true, totalMarks: true, subject: { select: { id: true, name: true } } },
          orderBy: { subject: { name: "asc" } },
        },
      },
    }),
    prisma.teacherComment.findMany({
      where: { studentId, ...(opts.audience === "parent" ? { isPublished: true } : {}) },
      orderBy: [{ commentDate: "desc" }, { createdAt: "desc" }],
      select: COMMENT_SELECT,
    }),
  ]);

  const attendanceRows = attendance.map((a) => ({ ...a, date: toISODate(a.date) }));

  const commentRows = shapeComments(comments, tuition);
  // Published-for-parents comments about a tuition test, shown under that test's mark.
  const examComments = new Map<string, { id: string; content: string; isPublished: boolean }[]>();
  for (const c of commentRows) {
    if (!c.exam) continue;
    examComments.set(c.exam.id, [...(examComments.get(c.exam.id) ?? []), { id: c.id, content: c.content, isPublished: c.isPublished }]);
  }

  const tuitionRows = tuition.map((r) => ({
    id: r.id,
    examId: r.exam.id,
    examName: r.exam.name,
    subject: r.exam.subject.name,
    date: toISODate(r.exam.date),
    marks: r.marksObtained,
    total: r.exam.totalMarks,
    percent: percent(r.marksObtained, r.exam.totalMarks),
    remarks: r.remarks,
    teacherComments: examComments.get(r.exam.id) ?? [],
  }));

  const schoolExams = school.map((e) => {
    const results = e.results.map((r) => ({
      id: r.id,
      subjectId: r.subject.id,
      subject: r.subject.name,
      marks: r.marksObtained,
      total: r.totalMarks,
      percent: percent(r.marksObtained, r.totalMarks),
    }));
    return {
      id: e.id,
      examType: e.examType as SchoolExamType,
      examName: e.examName,
      title: schoolExamTitle(e.examType, e.examName),
      date: toISODate(e.examDate),
      remarks: e.remarks,
      status: e.status as SubmissionStatus,
      adminNote: e.adminNote,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
      results,
      overall: average(results.map((r) => r.percent)),
    };
  });

  // Analysis never mixes school and tuition results. School results that the
  // teacher flagged for correction are left out of the analysis.
  const schoolForAnalysis = schoolExams.filter((e) => e.status !== "NEEDS_CORRECTION");
  const schoolScoreRows: ScoreRow[] = schoolForAnalysis.flatMap((e) =>
    e.results.map((r) => ({ subject: r.subject, date: e.date, percent: r.percent, label: shortExamLabel(e) })),
  );
  const tuitionScoreRows: ScoreRow[] = tuitionRows.map((r) => ({ subject: r.subject, date: r.date, percent: r.percent }));

  return {
    attendance: attendanceRows,
    attendanceSummary: attendanceCounts(attendanceRows),
    attendanceMonthly: monthlyAttendance(attendanceRows),
    tuition: tuitionRows,
    tuitionBySubject: subjectPerformance(tuitionScoreRows),
    tuitionOverall: average(tuitionRows.map((r) => r.percent)),
    tuitionScoreRows,
    school: schoolExams,
    schoolBySubject: subjectPerformance(schoolScoreRows),
    schoolOverall: average(schoolForAnalysis.flatMap((e) => e.results.map((r) => r.percent))),
    schoolScoreRows,
    schoolExamTrend: [...schoolForAnalysis]
      .filter((e) => e.overall !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((e) => ({ label: shortExamLabel(e), date: e.date, percent: e.overall as number })),
    comments: commentRows,
  };
}

/** Fields loaded for every teacher comment (with its linked test and conversation). */
export const COMMENT_SELECT = {
  id: true,
  category: true,
  content: true,
  commentDate: true,
  isPublished: true,
  tuitionExam: { select: { id: true, name: true, date: true, totalMarks: true, subject: { select: { name: true } } } },
  photo: { select: { updatedAt: true } },
  replies: {
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      authorType: true,
      parentId: true,
      content: true,
      readAt: true,
      createdAt: true,
      admin: { select: { name: true } },
      parent: { select: { name: true } },
    },
  },
} as const satisfies Prisma.TeacherCommentSelect;

type CommentWithLinks = Prisma.TeacherCommentGetPayload<{ select: typeof COMMENT_SELECT }>;

/**
 * Turns loaded comments into plain rows for the UI. `results` are the student's
 * tuition marks, used to show the mark of the test a "Keputusan Ujian" comment is about.
 */
export function shapeComments(
  comments: CommentWithLinks[],
  results: { marksObtained: number; exam: { id: string } }[],
) {
  const markByExam = new Map(results.map((r) => [r.exam.id, r.marksObtained]));
  return comments.map((c) => {
    const e = c.tuitionExam;
    const marks = e ? markByExam.get(e.id) : undefined;
    return {
      id: c.id,
      category: c.category as CommentCategory,
      content: c.content,
      commentDate: toISODate(c.commentDate),
      isPublished: c.isPublished,
      /** Picture URL (cache-busted by its update time), or null when there is none. */
      photoUrl: c.photo ? `/api/ulasan-foto/${c.id}?v=${c.photo.updatedAt.getTime()}` : null,
      exam: e
        ? {
            id: e.id,
            name: e.name,
            subject: e.subject.name,
            date: toISODate(e.date),
            percent: marks === undefined ? null : percent(marks, e.totalMarks),
          }
        : null,
      replies: c.replies.map((r) => ({
        id: r.id,
        fromParent: r.authorType === "PARENT",
        parentId: r.parentId,
        authorName: r.authorType === "PARENT" ? (r.parent?.name ?? "Ibu bapa") : (r.admin?.name ?? "Guru"),
        content: r.content,
        unread: r.readAt === null,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}

export type CommentRow = ReturnType<typeof shapeComments>[number];

export type StudentRecords = Awaited<ReturnType<typeof getStudentRecords>>;

export function schoolExamTitle(type: string, name: string) {
  const label = SCHOOL_EXAM_LABELS[type as SchoolExamType] ?? type;
  return name ? `${label} — ${name}` : label;
}

function shortExamLabel(e: { examType: string; date: string }) {
  const short: Record<string, string> = {
    MONTHLY_TEST: "Ujian Bulanan",
    MID_YEAR: "Pertengahan Tahun",
    FINAL: "Akhir Tahun",
    UASA: "UASA",
    OTHER: "Lain-lain",
  };
  return `${short[e.examType] ?? e.examType} (${e.date.slice(5, 7)}/${e.date.slice(2, 4)})`;
}
