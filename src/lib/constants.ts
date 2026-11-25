// Labels and options shared by server and client code (no server imports here).
import type {
  AttendanceStatus,
  CommentCategory,
  SchoolExamType,
  SubmissionStatus,
} from "@/generated/prisma/enums";

export const BRAND = "Moons HomeTuition";
export const BRAND_NAME = "Moons HomeTuition";
export const BRAND_TAGLINE = "Adab · Rajin · Berjaya";

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
  EXAM_RESULT: "Keputusan Ujian",
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
  "EXAM_RESULT",
  "STRENGTHS",
  "IMPROVEMENT",
  "PARTICIPATION",
  "HOMEWORK",
  "ATTITUDE",
  "RECOMMENDATIONS",
  "GENERAL",
] as const satisfies readonly CommentCategory[];

/** Longest reply a teacher or parent can post under a comment. */
export const REPLY_MAX = 1000;

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

// ───────── First-login consent (parents) ─────────

export const CONSENT_TITLE = "Pengesahan & Persetujuan Ibu Bapa / Penjaga";
export const CONSENT_PARAGRAPHS = [
  "Saya bersetuju bahawa pihak Moons HomeTuition boleh mendidik anak saya dengan kaedah pembelajaran yang positif dan bersesuaian dengan umur anak.",
  "Saya faham bahawa pihak Moons HomeTuition TIDAK AKAN menggunakan sebarang bentuk hukuman fizikal dengan niat mencederakan anak saya dari segi fizikal dan emosi.",
  "Saya juga bersetuju untuk dihubungi oleh pihak Moons HomeTuition berkaitan perkembangan pembelajaran anak saya.",
] as const;
export const CONSENT_CHECKBOX = "Saya telah membaca dan bersetuju dengan kenyataan di atas.";
/** Exact wording saved with every consent record. */
export const CONSENT_STATEMENT = [CONSENT_TITLE, ...CONSENT_PARAGRAPHS, `[✓] ${CONSENT_CHECKBOX}`].join("\n\n");

// ───────── Class timetable ─────────

export const SESSION_STATUSES = ["SCHEDULED", "REPLACEMENT", "EXTRA", "HOLIDAY", "CANCELLED"] as const;
export type SessionStatusValue = (typeof SESSION_STATUSES)[number];
/** Labels in the admin form. Parents see "Kelas Seterusnya" on the nearest scheduled class. */
export const SESSION_STATUS_LABELS: Record<SessionStatusValue, string> = {
  SCHEDULED: "Dijadualkan",
  REPLACEMENT: "Kelas Ganti",
  EXTRA: "Kelas Tambahan",
  HOLIDAY: "Cuti",
  CANCELLED: "Dibatalkan",
};

/** Classes that actually take place (shown in reminders; attendance is charged as usual). */
export const RUNNING_SESSION_STATUSES = ["SCHEDULED", "REPLACEMENT", "EXTRA"] as const satisfies readonly SessionStatusValue[];
export const isRunningSession = (status: string) => (RUNNING_SESSION_STATUSES as readonly string[]).includes(status);

// ───────── Status Yuran (admin only) ─────────

export const PAYMENT_STATUSES = ["PAID", "UNPAID", "OVERDUE"] as const;
export type PaymentStatusValue = (typeof PAYMENT_STATUSES)[number];
export const PAYMENT_LABELS: Record<PaymentStatusValue, string> = {
  PAID: "Sudah Bayar",
  UNPAID: "Belum Bayar",
  OVERDUE: "Tertunggak",
};
/** Fee per attended class when the admin has not set one yet (RM). */
export const DEFAULT_FEE_PER_CLASS = 10;
