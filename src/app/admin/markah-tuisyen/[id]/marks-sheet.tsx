"use client";

import { useState } from "react";
import { ActionForm, FieldError, SubmitButton } from "@/components/forms";
import { Badge, cn, inputClass } from "@/components/ui";
import { gradeFor } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

type Row = { id: string; code: string; name: string; enrolled: boolean; inactive: boolean; marks: string; remarks: string };

export function MarksSheet({
  rows: initial,
  totalMarks,
  action,
}: {
  rows: Row[];
  totalMarks: number;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [rows, setRows] = useState(initial);
  const set = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.marks.trim() !== "").length;

  return (
    <ActionForm action={action}>
      <div className="divide-y divide-line">
        <div className="hidden grid-cols-[100px_1fr_150px_110px_1fr] gap-4 bg-beige-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
          <span>ID Murid</span>
          <span>Nama</span>
          <span>Markah / {totalMarks}</span>
          <span>Peratus</span>
          <span>Catatan</span>
        </div>
        {rows.map((r) => {
          const value = Number(r.marks);
          const valid = r.marks.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= totalMarks;
          const pct = valid ? Math.round((value / totalMarks) * 1000) / 10 : null;
          return (
            <div key={r.id} className="grid gap-2 px-4 py-3 md:grid-cols-[100px_1fr_150px_110px_1fr] md:items-center md:gap-4">
              <input type="hidden" name="studentIds" value={r.id} />
              <span className="font-mono text-xs text-ink-soft">{r.code}</span>
              <span className="text-sm font-medium text-ink">
                {r.name}{" "}
                {!r.enrolled && <span className="text-[11px] font-normal text-muted">(tidak berdaftar subjek ini)</span>}
                {r.inactive && <span className="text-[11px] font-normal text-muted">(tidak aktif)</span>}
              </span>
              <div>
                <input
                  name={`marks_${r.id}`}
                  value={r.marks}
                  onChange={(e) => set(r.id, { marks: e.target.value })}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={totalMarks}
                  step="0.5"
                  placeholder="—"
                  aria-label={`Markah ${r.name}`}
                  className={cn(inputClass, "py-2", r.marks.trim() !== "" && !valid && "border-rose-ink")}
                />
                <FieldError name={`marks_${r.id}`} />
              </div>
              <span>
                {pct === null ? (
                  <span className="text-sm text-muted">—</span>
                ) : (
                  <Badge tone={pct >= 80 ? "sage" : pct >= 50 ? "beige" : pct >= 40 ? "amber" : "rose"}>
                    {pct.toFixed(1)}% · {gradeFor(pct).grade}
                  </Badge>
                )}
              </span>
              <input
                name={`remarks_${r.id}`}
                value={r.remarks}
                onChange={(e) => set(r.id, { remarks: e.target.value })}
                placeholder="Catatan (pilihan)"
                maxLength={300}
                className={cn(inputClass, "py-2")}
              />
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4">
        <p className="text-xs text-muted">{filled} markah dimasukkan. Kosongkan markah untuk membuang rekod murid tersebut.</p>
        <SubmitButton>Simpan Markah</SubmitButton>
      </div>
    </ActionForm>
  );
}
