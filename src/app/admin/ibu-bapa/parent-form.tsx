import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input, Select, Textarea } from "@/components/ui";
import { RELATIONSHIP_OPTIONS } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

export function ParentForm({
  action,
  students,
  defaults = {},
  submitLabel,
  codeHint,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  students: { id: string; fullName: string; studentCode: string; isActive: boolean }[];
  defaults?: {
    parentCode?: string;
    name?: string;
    phone?: string | null;
    notes?: string | null;
    children?: { studentId: string; relationship: string | null }[];
  };
  submitLabel: string;
  codeHint?: string;
}) {
  const linked = new Map((defaults.children ?? []).map((c) => [c.studentId, c.relationship ?? ""]));
  return (
    <ActionForm action={action} className="space-y-5" resetOnSuccess={!defaults.name}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ID Ibu Bapa" name="parentCode" hint={codeHint}>
          <Input
            id="parentCode"
            name="parentCode"
            defaultValue={defaults.parentCode}
            placeholder="Auto (cth. MHT004-K7QX)"
            className="font-mono uppercase"
            spellCheck={false}
          />
        </Field>
        <Field label="No. Telefon" name="phone">
          <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone ?? ""} placeholder="cth. 012-345 6789" />
        </Field>
        <Field label="Nama Ibu Bapa / Penjaga" name="name" required className="sm:col-span-2">
          <Input id="name" name="name" defaultValue={defaults.name} required />
        </Field>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium text-ink-soft">Anak (boleh pilih lebih daripada seorang)</legend>
        {students.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Belum ada murid. Tambah murid dahulu.</p>
        ) : (
          <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-2xl border border-line p-2">
            {students.map((s) => (
              <div key={s.id} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-beige-50 has-checked:bg-sage-50">
                <label className="flex flex-1 cursor-pointer items-center gap-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="childIds"
                    value={s.id}
                    defaultChecked={linked.has(s.id)}
                    className="size-4 accent-sage-600"
                  />
                  <span className="min-w-0">
                    <span className="font-medium text-ink">{s.fullName}</span>
                    <span className="ml-1.5 text-xs text-muted">
                      {s.studentCode}
                      {!s.isActive && " · tidak aktif"}
                    </span>
                  </span>
                </label>
                <Select name={`rel_${s.id}`} defaultValue={linked.get(s.id) ?? ""} className="w-28 py-1.5 sm:text-xs" aria-label="Hubungan">
                  <option value="">Hubungan</option>
                  {RELATIONSHIP_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <Field label="Catatan (untuk admin sahaja)" name="notes">
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
