"use client";

import { useState } from "react";
import { CheckCheck, Eraser } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { buttonClass, cn, inputClass } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

type Status = "PRESENT" | "ABSENT" | "EXCUSED" | "";

type Row = { id: string; code: string; name: string; isDemo: boolean; status: Status; note: string };

const OPTIONS: { value: Exclude<Status, "">; label: string; on: string }[] = [
  { value: "PRESENT", label: "Hadir", on: "bg-sage-600 text-white border-sage-600" },
  { value: "ABSENT", label: "Tidak Hadir", on: "bg-rose-ink text-white border-rose-ink" },
  { value: "EXCUSED", label: "Bersebab", on: "bg-amber-ink text-white border-amber-ink" },
];

export function AttendanceSheet({
  rows: initialRows,
  action,
  alreadyRecorded,
}: {
  rows: Row[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  alreadyRecorded: boolean;
}) {
  const [rows, setRows] = useState(initialRows);
  const set = (id: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const counts = {
    present: rows.filter((r) => r.status === "PRESENT").length,
    absent: rows.filter((r) => r.status === "ABSENT").length,
    excused: rows.filter((r) => r.status === "EXCUSED").length,
    blank: rows.filter((r) => r.status === "").length,
  };

  return (
    <ActionForm action={action}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={buttonClass("soft", "sm")}
            onClick={() => setRows((rs) => rs.map((r) => ({ ...r, status: "PRESENT" })))}
          >
            <CheckCheck className="size-4" /> Tandakan Semua Hadir
          </button>
          <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setRows((rs) => rs.map((r) => ({ ...r, status: "" })))}>
            <Eraser className="size-4" /> Kosongkan
          </button>
        </div>
        <p className="text-[13px] text-muted">
          <span className="font-medium text-sage-700">{counts.present} hadir</span> ·{" "}
          <span className="font-medium text-rose-ink">{counts.absent} tidak hadir</span> ·{" "}
          <span className="font-medium text-amber-ink">{counts.excused} bersebab</span>
          {counts.blank > 0 && <> · {counts.blank} belum ditanda</>}
        </p>
      </div>

      {/* Table on larger screens, stacked cards on phones */}
      <div className="divide-y divide-line">
        <div className="hidden grid-cols-[110px_1fr_330px_1fr] gap-4 bg-beige-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted md:grid">
          <span>ID Murid</span>
          <span>Nama Murid</span>
          <span>Kehadiran</span>
          <span>Catatan</span>
        </div>
        {rows.map((r) => (
          <div key={r.id} className="grid gap-2.5 px-4 py-3 md:grid-cols-[110px_1fr_330px_1fr] md:items-center md:gap-4">
            <input type="hidden" name="studentIds" value={r.id} />
            <input type="hidden" name={`status_${r.id}`} value={r.status} />
            <span className="font-mono text-xs text-ink-soft">{r.code}</span>
            <span className="text-sm font-medium text-ink">
              {r.name}
              {r.isDemo && <span className="ml-1.5 text-[11px] font-normal text-sky-ink">(demo)</span>}
            </span>
            <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={`Kehadiran ${r.name}`}>
              {OPTIONS.map((o) => {
                const on = r.status === o.value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => set(r.id, { status: on ? "" : o.value })}
                    className={cn(
                      "rounded-xl border px-2 py-2 text-[13px] font-medium transition-colors",
                      on ? o.on : "border-line bg-surface text-ink-soft hover:bg-beige-50",
                    )}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <input
              name={`note_${r.id}`}
              value={r.note}
              onChange={(e) => set(r.id, { note: e.target.value })}
              placeholder="Catatan (pilihan)"
              maxLength={300}
              className={cn(inputClass, "py-2")}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-4">
        <p className="text-xs text-muted">
          {alreadyRecorded ? "Kehadiran tarikh ini telah direkod. Simpan untuk mengemas kini." : "Murid yang tidak ditanda tidak akan direkod."}
        </p>
        <SubmitButton>{alreadyRecorded ? "Kemas Kini Kehadiran" : "Simpan Kehadiran"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
