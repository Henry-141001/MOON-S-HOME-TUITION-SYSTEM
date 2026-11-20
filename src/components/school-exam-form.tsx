"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm, Field, FieldError, SubmitButton } from "@/components/forms";
import { buttonClass, cn, inputClass, Input, Select, Textarea } from "@/components/ui";
import { SCHOOL_EXAM_LABELS, SCHOOL_EXAM_TYPES, gradeFor } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

/** One subject row. `marks` is the percentage (0–100) as typed. */
type Row = { key: number; subjectId: string; marks: string };

export function SchoolExamForm({
  action,
  subjects,
  defaults,
  submitLabel,
  maxDate,
  clearAfterSubmit = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subjects: { id: string; name: string }[];
  defaults?: {
    examType?: string;
    examName?: string;
    examDate?: string;
    remarks?: string | null;
    rows?: { subjectId: string; percent: number }[];
  };
  submitLabel: string;
  maxDate: string;
  /** For "new submission" forms: empty the form after a successful submit. */
  clearAfterSubmit?: boolean;
}) {
  const initialRows = (): Row[] =>
    defaults?.rows?.length
      ? defaults.rows.map((r, i) => ({ key: i, subjectId: r.subjectId, marks: String(r.percent) }))
      : [{ key: 0, subjectId: "", marks: "" }];
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [examType, setExamType] = useState(defaults?.examType ?? "");
  const nextKey = () => Math.max(-1, ...rows.map((r) => r.key)) + 1;
  const set = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <ActionForm
      action={action}
      className="space-y-5"
      resetOnSuccess={clearAfterSubmit}
      onSuccess={
        clearAfterSubmit
          ? () => {
              setRows([{ key: Date.now(), subjectId: "", marks: "" }]);
              setExamType("");
            }
          : undefined
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Jenis Peperiksaan" name="examType" required>
          <Select id="examType" name="examType" value={examType} onChange={(e) => setExamType(e.target.value)} required>
            <option value="" disabled>
              Pilih jenis peperiksaan
            </option>
            {SCHOOL_EXAM_TYPES.map((t) => (
              <option key={t} value={t}>
                {SCHOOL_EXAM_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tarikh Peperiksaan" name="examDate" required>
          <Input id="examDate" name="examDate" type="date" max={maxDate} defaultValue={defaults?.examDate} required />
        </Field>
        <Field
          label={examType === "OTHER" ? "Nama Peperiksaan" : "Nama Peperiksaan (pilihan)"}
          name="examName"
          required={examType === "OTHER"}
          className="sm:col-span-2"
          hint="cth. Ujian Bulan Mac, Peperiksaan Percubaan"
        >
          <Input id="examName" name="examName" defaultValue={defaults?.examName} maxLength={80} />
        </Field>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium text-ink-soft">Peratus Markah Mengikut Subjek</legend>
        <div className="mt-2 space-y-2">
          {rows.map((r) => {
            const m = Number(r.marks);
            const pct = r.marks !== "" && Number.isFinite(m) && m >= 0 && m <= 100 ? m : null;
            return (
              <div key={r.key} className="rounded-2xl border border-line bg-beige-50/40 p-3">
                <input type="hidden" name="row" value={r.key} />
                <div className="grid grid-cols-[1fr_auto_36px] gap-2 sm:grid-cols-[1fr_130px_64px_36px] sm:items-start">
                  <div className="col-span-3 sm:col-span-1">
                    <select
                      name={`subjectId_${r.key}`}
                      value={r.subjectId}
                      onChange={(e) => set(r.key, { subjectId: e.target.value })}
                      aria-label="Subjek"
                      className={cn(inputClass, "py-2")}
                    >
                      <option value="">Pilih subjek</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <FieldError name={`subjectId_${r.key}`} />
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        name={`marks_${r.key}`}
                        value={r.marks}
                        onChange={(e) => set(r.key, { marks: e.target.value })}
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step="0.1"
                        placeholder="Peratus"
                        aria-label="Peratus markah"
                        className={cn(inputClass, "py-2 pr-8")}
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">%</span>
                    </div>
                    <FieldError name={`marks_${r.key}`} />
                  </div>
                  <div className="flex h-10 min-w-16 items-center justify-center text-sm font-semibold text-navy-700" aria-live="polite">
                    {pct === null ? <span className="font-normal text-muted">Gred –</span> : `Gred ${gradeFor(pct).grade}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))}
                    disabled={rows.length === 1}
                    className="grid h-10 w-9 place-items-center justify-self-end rounded-xl text-muted hover:bg-beige-100 disabled:opacity-30"
                    aria-label="Buang subjek"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className={cn(buttonClass("soft", "sm"), "mt-3")}
          onClick={() => setRows((rs) => [...rs, { key: nextKey(), subjectId: "", marks: "" }])}
        >
          <Plus className="size-4" /> Tambah Subjek
        </button>
        <p className="mt-2 text-xs text-muted">Masukkan markah dalam peratus (0–100%), seperti dalam slip keputusan sekolah.</p>
      </fieldset>

      <Field label="Catatan (pilihan)" name="remarks">
        <Textarea id="remarks" name="remarks" defaultValue={defaults?.remarks ?? ""} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
