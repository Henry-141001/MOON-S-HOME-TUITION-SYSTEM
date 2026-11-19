// Labels and options shared by server and client code (no server imports here).
import type {
  AttendanceStatus,
  CommentCategory,
  SchoolExamType,
  SubmissionStatus,
} from "@/generated/prisma/enums";

export const BRAND = "MOON'S HOME TUITION";

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Hadir",
  ABSENT: "Tidak Hadir",
  EXCUSED: "Bersebab",
};
export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "EXCUSED"] as const satisfies readonly AttendanceStatus[];

export const SCHOOL_EXAM_LABELS: Record<SchoolExamType, string> = {
  MONTHLY_TEST: "Ujian Bulanan",
  MID_YEAR: "Peperiksaan Pertengahan Tahun",
  FINAL: "Peperiksaan Akhir Tahun",
  UASA: "UASA",
  OTHER: "Lain-lain",
};
export const SCHOOL_EXAM_TYPES = ["MONTHLY_TEST", "MID_YEAR", "FINAL", "UASA", "OTHER"] as const satisfies readonly SchoolExamType[];

export const SUBMISSION_LABELS: Record<SubmissionStatus, string> = {
  PENDING: "Menunggu Semakan",
  APPROVED: "Diluluskan",
  NEEDS_CORRECTION: "Perlu Pembetulan",
};
export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "NEEDS_CORRECTION"] as const satisfies readonly SubmissionStatus[];

export const COMMENT_LABELS: Record<CommentCategory, string> = {
  ACADEMIC: "Prestasi Akademik",
  STRENGTHS: "Kekuatan",
  IMPROVEMENT: "Ruang Penambahbaikan",
  PARTICIPATION: "Penyertaan Dalam Kelas",
  HOMEWORK: "Kerja Rumah",
  ATTITUDE: "Sikap dan Disiplin",
  RECOMMENDATIONS: "Cadangan untuk Ibu Bapa",
  GENERAL: "Ulasan Umum",
};
export const COMMENT_CATEGORIES = [
  "ACADEMIC",
  "STRENGTHS",
  "IMPROVEMENT",
  "PARTICIPATION",
  "HOMEWORK",
  "ATTITUDE",
  "RECOMMENDATIONS",
  "GENERAL",
] as const satisfies readonly CommentCategory[];

export const YEAR_FORM_OPTIONS = [
  "Prasekolah",
  "Tahun 1",
  "Tahun 2",
  "Tahun 3",
  "Tahun 4",
  "Tahun 5",
  "Tahun 6",
  "Tingkatan 1",
  "Tingkatan 2",
  "Tingkatan 3",
  "Tingkatan 4",
  "Tingkatan 5",
  "Tingkatan 6",
];

export const RELATIONSHIP_OPTIONS = ["Ibu", "Bapa", "Penjaga"];

/** Malaysian-style grade band from a percentage. */
export function gradeFor(percent: number): { grade: string; tone: "good" | "ok" | "warn" | "bad" } {
  if (percent >= 80) return { grade: "A", tone: "good" };
  if (percent >= 65) return { grade: "B", tone: "good" };
  if (percent >= 50) return { grade: "C", tone: "ok" };
  if (percent >= 40) return { grade: "D", tone: "warn" };
  return { grade: "E", tone: "bad" };
}
