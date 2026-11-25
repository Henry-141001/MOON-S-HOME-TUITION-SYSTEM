import "server-only";
import { prisma } from "@/lib/prisma";
import { monthBounds, parseISODate } from "@/lib/dates";
import { DEFAULT_FEE_PER_CLASS, type PaymentStatusValue } from "@/lib/constants";

/**
 * Status Yuran — ADMIN ONLY. Callers must check requireAdminView / requireAdmin first.
 *
 * The fee is never typed in: it is worked out from attendance every time.
 *   fee = (classes marked "Hadir" in the month) x (fee per class for that month)
 * So when the teacher marks a student present at a Kelas Ganti / Kelas Tambahan,
 * that month's fee goes up by itself. The admin only sets the Status Bayaran.
 */

/** Fee per class for a month: the latest rate that started on or before that month. */
export async function feeRateForMonth(month: string) {
  const rate = await prisma.feeRate.findFirst({
    where: { effectiveMonth: { lte: month } },
    orderBy: { effectiveMonth: "desc" },
  });
  return { ratePerClass: rate?.ratePerClass ?? DEFAULT_FEE_PER_CLASS, effectiveMonth: rate?.effectiveMonth ?? null };
}

export type FeeRow = {
  studentId: string;
  name: string;
  code: string;
  isActive: boolean;
  /** Classes marked Hadir this month. */
  attended: number;
  /** Classes marked at all this month (Hadir + Tidak Hadir + Bersebab). */
  marked: number;
  amount: number;
  status: PaymentStatusValue;
  /** Fee when it was marked Sudah Bayar (null if never). */
  paidAmount: number | null;
  /** More classes were attended after it was marked Sudah Bayar: the extra still to collect. */
  owedSincePaid: number;
};

export type FeeSummary = Record<PaymentStatusValue, { amount: number; students: number }>;

/** Every student's fee for one month ("YYYY-MM"), plus the totals per Status Bayaran. */
export async function monthFees(month: string) {
  const { start, end } = monthBounds(month);
  const range = { gte: parseISODate(start), lte: parseISODate(end) };
  const [{ ratePerClass, effectiveMonth }, counts, payments] = await Promise.all([
    feeRateForMonth(month),
    prisma.attendance.groupBy({ by: ["studentId", "status"], where: { date: range }, _count: { _all: true } }),
    prisma.feePayment.findMany({ where: { month }, select: { studentId: true, status: true, paidAmount: true } }),
  ]);

  // Active students, plus anyone (even inactive now) who has attendance or a payment record this month.
  const involved = new Set([...counts.map((c) => c.studentId), ...payments.map((p) => p.studentId)]);
  const students = await prisma.student.findMany({
    where: { OR: [{ isActive: true }, { id: { in: [...involved] } }] },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, studentCode: true, isActive: true },
  });

  const rows: FeeRow[] = students.map((s) => {
    const mine = counts.filter((c) => c.studentId === s.id);
    const attended = mine.find((c) => c.status === "PRESENT")?._count._all ?? 0;
    const marked = mine.reduce((n, c) => n + c._count._all, 0);
    const amount = round2(attended * ratePerClass);
    const pay = payments.find((p) => p.studentId === s.id);
    const status = (pay?.status ?? "UNPAID") as PaymentStatusValue;
    const paidAmount = pay?.paidAmount ?? null;
    const owedSincePaid = status === "PAID" && paidAmount !== null && amount > paidAmount ? round2(amount - paidAmount) : 0;
    return { studentId: s.id, name: s.fullName, code: s.studentCode, isActive: s.isActive, attended, marked, amount, status, paidAmount, owedSincePaid };
  });

  const summary: FeeSummary = {
    PAID: { amount: 0, students: 0 },
    UNPAID: { amount: 0, students: 0 },
    OVERDUE: { amount: 0, students: 0 },
  };
  for (const r of rows) {
    summary[r.status].students++;
    // Extra classes attended after "Sudah Bayar" are not paid yet: they count as Belum Bayar.
    summary[r.status].amount = round2(summary[r.status].amount + r.amount - r.owedSincePaid);
    if (r.owedSincePaid > 0) summary.UNPAID.amount = round2(summary.UNPAID.amount + r.owedSincePaid);
  }
  return { month, ratePerClass, rateFrom: effectiveMonth, rows, summary };
}

export type MonthFees = Awaited<ReturnType<typeof monthFees>>;

/** "RM40" / "RM12.50" */
export function formatRM(value: number) {
  return `RM${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
