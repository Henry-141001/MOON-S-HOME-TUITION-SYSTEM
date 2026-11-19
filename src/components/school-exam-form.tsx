"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { ActionForm, Field, FieldError, SubmitButton } from "@/components/forms";
import { buttonClass, cn, inputClass, Input, Select, Textarea } from "@/components/ui";
import { SCHOOL_EXAM_LABELS, SCHOOL_EXAM_TYPES } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

type Row = { key: number; subjectId: string; marks: string; total: string };

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
    rows?: { subjectId: string; marks: number; total: number }[];
  };
  submitLabel: string;
  maxDate: string;
  /** For "new submission" forms: empty the form after a successful submit. */
  clearAfterSubmit?: boolean;
}) {
  const initialRows = (): Row[] =>
    defaults?.rows?.length
      ? defaults.rows.map((r, i) => ({ key: i, subjectId: r.subjectId, marks: String(r.marks), total: String(r.total) }))
      : [{ key: 0, subjectId: "", marks: "", total: "100" }];
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
              setRows([{ key: Date.now(), subjectId: "", marks: "", total: "100" }]);
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
        <legend className="text-[13px] font-medium text-ink-soft">Markah Mengikut Subjek</legend>
        <div className="mt-2 space-y-2">
          {rows.map((r) => {
            const m = Number(r.marks);
            const t = Number(r.total);
            const pct = r.marks !== "" && r.total !== "" && t > 0 && m >= 0 && m <= t ? Math.round((m / t) * 1000) / 10 : null;
            return (
              <div key={r.key} className="rounded-2xl border border-line bg-beige-50/40 p-3">
                <input type="hidden" name="row" value={r.key} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_110px_110px_80px_36px] sm:items-start">
                  <div className="col-span-2 sm:col-span-1">
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
                    <input
                      name={`marks_${r.key}`}
                      value={r.marks}
                      onChange={(e) => set(r.key, { marks: e.target.value })}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.5"
                      placeholder="Markah"
                      aria-label="Markah diperoleh"
                      className={cn(inputClass, "py-2")}
                    />
                    <FieldError name={`marks_${r.key}`} />
                  </div>
                  <div>
                    <input
                      name={`total_${r.key}`}
                      value={r.total}
                      onChange={(e) => set(r.key, { total: e.target.value })}
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="0.5"
                      placeholder="Jumlah"
                      aria-label="Jumlah markah"
                      className={cn(inputClass, "py-2")}
                    />
                    <FieldError name={`total_${r.key}`} />
                  </div>
                  <div className="flex h-10 items-center text-sm font-medium text-sage-700">{pct === null ? "—" : `${pct}%`}</div>
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
          onClick={() => setRows((rs) => [...rs, { key: nextKey(), subjectId: "", marks: "", total: rs[rs.length - 1]?.total ?? "100" }])}
        >
          <Plus className="size-4" /> Tambah Subjek
        </button>
        <p className="mt-2 text-xs text-muted">Peratus dikira secara automatik.</p>
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
