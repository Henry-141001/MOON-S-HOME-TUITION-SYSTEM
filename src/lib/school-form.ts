import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, formObject, isoDate, optionalText, parse } from "@/lib/action";
import { SCHOOL_EXAM_TYPES } from "@/lib/constants";
import { todayISO } from "@/lib/dates";
import type { ActionState } from "@/lib/action-state";
import type { SchoolExamType } from "@/generated/prisma/enums";

const headerSchema = z
  .object({
    examType: z.enum(SCHOOL_EXAM_TYPES, { error: "Sila pilih jenis peperiksaan." }),
    examName: z.string().trim().max(80, "Nama terlalu panjang.").optional().transform((v) => v ?? ""),
    examDate: isoDate("Tarikh peperiksaan").refine((v) => v <= todayISO(), "Tarikh peperiksaan tidak boleh pada masa hadapan."),
    remarks: optionalText(500),
  })
  .refine((v) => v.examType !== "OTHER" || v.examName.length > 0, {
    message: "Sila nyatakan nama peperiksaan untuk jenis 'Lain-lain'.",
    path: ["examName"],
  });

export type ParsedSchoolExam = {
  examType: SchoolExamType;
  examName: string;
  examDate: string;
  remarks: string | null;
  rows: { subjectId: string; marksObtained: number; totalMarks: number }[];
};

/**
 * Parses the school-result form: header fields plus repeated rows
 * (row=<i>, subjectId_<i>, marks_<i>, total_<i>). Validates every row.
 */
export async function parseSchoolExamForm(
  formData: FormData,
): Promise<{ data: ParsedSchoolExam; error?: undefined } | { data?: undefined; error: ActionState }> {
  const header = parse(headerSchema, formObject(formData));
  if (header.error) return { error: header.error };

  const indices = [...new Set(formData.getAll("row").map(String))];
  const fieldErrors: Record<string, string> = {};
  const rows: ParsedSchoolExam["rows"] = [];
  const seen = new Set<string>();

  for (const i of indices) {
    const subjectId = String(formData.get(`subjectId_${i}`) ?? "");
    const marksRaw = String(formData.get(`marks_${i}`) ?? "").trim();
    const totalRaw = String(formData.get(`total_${i}`) ?? "").trim();
    if (!subjectId && !marksRaw) continue; // blank row
    const marksObtained = Number(marksRaw);
    const totalMarks = Number(totalRaw);
    if (!subjectId) fieldErrors[`subjectId_${i}`] = "Pilih subjek.";
    else if (seen.has(subjectId)) fieldErrors[`subjectId_${i}`] = "Subjek ini telah dimasukkan.";
    if (marksRaw === "" || !Number.isFinite(marksObtained) || marksObtained < 0) fieldErrors[`marks_${i}`] = "Markah tidak sah.";
    if (totalRaw === "" || !Number.isFinite(totalMarks) || totalMarks <= 0) fieldErrors[`total_${i}`] = "Jumlah tidak sah.";
    else if (marksObtained > totalMarks) fieldErrors[`marks_${i}`] = "Melebihi jumlah markah.";
    if (subjectId) seen.add(subjectId);
    rows.push({ subjectId, marksObtained, totalMarks });
  }

  if (Object.keys(fieldErrors).length) return { error: fail("Sila betulkan markah yang ditanda.", fieldErrors) };
  if (rows.length === 0) return { error: fail("Sila masukkan sekurang-kurangnya satu subjek.") };

  const subjects = await prisma.subject.findMany({ where: { id: { in: rows.map((r) => r.subjectId) } }, select: { id: true } });
  if (subjects.length !== rows.length) return { error: fail("Satu atau lebih subjek tidak sah.") };

  return { data: { ...header.data, rows } };
}

export const DUPLICATE_SCHOOL_EXAM =
  "Keputusan untuk peperiksaan ini (jenis, nama dan tarikh yang sama) telah dihantar. Sila kemas kini rekod sedia ada.";
