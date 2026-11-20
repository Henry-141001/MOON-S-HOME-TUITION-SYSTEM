import "server-only";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ForbiddenError } from "@/lib/session";
import type { ActionState } from "@/lib/action-state";

export function ok(message: string): ActionState {
  return { status: "success", message, at: Date.now() };
}

export function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

/** Parse a zod schema; on failure returns a ready ActionState with per-field messages. */
export function parse<T extends z.ZodType>(
  schema: T,
  data: unknown,
): { data: z.infer<T>; error?: undefined } | { data?: undefined; error: ActionState } {
  const result = schema.safeParse(data);
  if (result.success) return { data: result.data };
  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: fail("Sila semak semula maklumat yang dimasukkan.", fieldErrors) };
}

/** Turns known errors into friendly messages. Re-throws Next.js redirects. */
export function handleError(error: unknown, duplicateMessage = "Rekod ini sudah wujud."): ActionState {
  if (isNextControlFlow(error)) throw error;
  if (error instanceof ForbiddenError) return fail("Anda tidak mempunyai akses kepada rekod ini.");
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return fail(duplicateMessage);
    if (error.code === "P2025") return fail("Rekod tidak dijumpai. Ia mungkin telah dipadam.");
    if (error.code === "P2003") return fail("Rekod ini sedang digunakan oleh rekod lain dan tidak boleh dipadam.");
  }
  console.error(error);
  return fail("Ralat sistem berlaku. Sila cuba sekali lagi.");
}

function isNextControlFlow(error: unknown): boolean {
  const digest = (error as { digest?: unknown } | null)?.digest;
  return typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND" || digest.startsWith("NEXT_HTTP_ERROR"));
}

// ───────── Reusable zod field helpers (messages in Malay) ─────────

export const text = (label: string, max = 200) =>
  z
    .string({ error: `${label} diperlukan.` })
    .trim()
    .min(1, `${label} diperlukan.`)
    .max(max, `${label} terlalu panjang (maksimum ${max} aksara).`);

export const optionalText = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, `Terlalu panjang (maksimum ${max} aksara).`)
    .optional()
    .transform((v) => (v ? v : null));

export const isoDate = (label = "Tarikh") =>
  z
    .string({ error: `${label} diperlukan.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label} tidak sah.`)
    .refine((v) => !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime()), `${label} tidak sah.`);

export const marks = (label: string) =>
  z.coerce
    .number({ error: `${label} mesti nombor.` })
    .refine((n) => Number.isFinite(n), `${label} mesti nombor.`)
    .min(0, `${label} tidak boleh negatif.`)
    .max(10000, `${label} terlalu besar.`);

/**
 * A checkbox field. Browsers send nothing at all for an unticked box, so the
 * value is normalised first: ticked ("on"/"true") → true, missing/anything else → false.
 * (A plain union with z.undefined() fails in zod v4 when the key is missing.)
 */
export const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export function formObject(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) if (typeof v === "string") out[k] = v;
  return out;
}
