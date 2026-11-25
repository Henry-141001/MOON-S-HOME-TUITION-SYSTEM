"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, formObject, handleError, ok, parse } from "@/lib/action";
import { PAYMENT_LABELS, PAYMENT_STATUSES } from "@/lib/constants";
import { formatMonth, monthBounds, parseISODate } from "@/lib/dates";
import { feeRateForMonth, formatRM } from "@/lib/fees";
import { adminActor, logActivity, studentLabel } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

// Status Yuran is ADMIN ONLY: every action here starts with requireAdmin().

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** The only thing the admin edits: Sudah Bayar / Belum Bayar / Tertunggak. */
export async function setFeeStatus(studentId: string, month: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!MONTH.test(month)) return fail("Bulan tidak sah.");
  const status = String(formData.get("status") ?? "");
  if (!(PAYMENT_STATUSES as readonly string[]).includes(status)) return fail("Sila pilih Status Bayaran.");
  const s = status as (typeof PAYMENT_STATUSES)[number];
  try {
    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { id: true } });
    if (!student) return fail("Murid tidak dijumpai.");
    // Remember the fee at the moment it was paid, so extra classes later are easy to spot.
    let paidAmount: number | null = null;
    if (s === "PAID") {
      const { start, end } = monthBounds(month);
      const [attended, { ratePerClass }] = await Promise.all([
        prisma.attendance.count({ where: { studentId, status: "PRESENT", date: { gte: parseISODate(start), lte: parseISODate(end) } } }),
        feeRateForMonth(month),
      ]);
      paidAmount = Math.round(attended * ratePerClass * 100) / 100;
    }
    await prisma.feePayment.upsert({
      where: { studentId_month: { studentId, month } },
      create: { studentId, month, status: s, paidAmount, updatedById: admin.id },
      update: { status: s, paidAmount, updatedById: admin.id },
    });
    await logActivity(
      adminActor(admin),
      "fee.status",
      `Status Bayaran ${await studentLabel(studentId)} (${formatMonth(month)}): ${PAYMENT_LABELS[s]}${paidAmount !== null ? ` · ${formatRM(paidAmount)}` : ""}`,
      studentId,
    );
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/admin", "layout");
  return ok(`Status Bayaran dikemas kini: ${PAYMENT_LABELS[s]}.`);
}

const rateSchema = z.object({
  ratePerClass: z.coerce
    .number({ error: "Masukkan jumlah dalam RM." })
    .refine((n) => Number.isFinite(n), "Masukkan jumlah dalam RM.")
    .min(0, "Yuran tidak boleh negatif.")
    .max(10000, "Jumlah terlalu besar."),
  effectiveMonth: z.string().regex(MONTH, "Sila pilih bulan."),
});

/** Fee per attended class, from a month onwards (earlier months keep their old rate). */
export async function setFeeRate(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(rateSchema, formObject(formData));
  if (parsed.error) return parsed.error;
  const rate = Math.round(parsed.data.ratePerClass * 100) / 100;
  const { effectiveMonth } = parsed.data;
  try {
    await prisma.feeRate.upsert({
      where: { effectiveMonth },
      create: { effectiveMonth, ratePerClass: rate },
      update: { ratePerClass: rate },
    });
    await logActivity(adminActor(admin), "fee.rate", `Yuran sekelas ditetapkan ${formatRM(rate)} mulai ${formatMonth(effectiveMonth)}`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/admin", "layout");
  return ok(`Yuran sekelas: ${formatRM(rate)} mulai ${formatMonth(effectiveMonth)}.`);
}
