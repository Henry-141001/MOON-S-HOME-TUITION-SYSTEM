import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input, Select, Textarea } from "@/components/ui";
import { RELATIONSHIP_OPTIONS, YEAR_FORM_OPTIONS } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

type Defaults = {
  studentCode?: string;
  fullName?: string;
  school?: string;
  yearForm?: string;
  guardianName?: string;
  registrationDate?: string;
  notes?: string | null;
  subjectIds?: string[];
};

export function StudentForm({
  action,
  defaults = {},
  subjects,
  parents,
  submitLabel,
  codeHint,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: Defaults;
  subjects: { id: string; name: string; isActive: boolean }[];
  /** Only on create: optionally link to an existing parent account straight away. */
  parents?: { id: string; name: string; parentCode: string }[];
  submitLabel: string;
  codeHint?: string;
}) {
  const selected = new Set(defaults.subjectIds ?? []);
  const visibleSubjects = subjects.filter((s) => s.isActive || selected.has(s.id));

  return (
    <ActionForm action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="ID Murid" name="studentCode" hint={codeHint}>
          <Input id="studentCode" name="studentCode" defaultValue={defaults.studentCode} placeholder="Auto (cth. STU011)" />
        </Field>
        <Field label="Tarikh Pendaftaran" name="registrationDate" required>
          <Input id="registrationDate" name="registrationDate" type="date" defaultValue={defaults.registrationDate} required />
        </Field>
        <Field label="Nama Penuh" name="fullName" required className="sm:col-span-2">
          <Input id="fullName" name="fullName" defaultValue={defaults.fullName} required />
        </Field>
        <Field label="Sekolah" name="school" required>
          <Input id="school" name="school" defaultValue={defaults.school} placeholder="cth. SK Taman Ria" required />
        </Field>
        <Field label="Tahun / Tingkatan" name="yearForm" required>
          <Input id="yearForm" name="yearForm" defaultValue={defaults.yearForm} list="year-form-options" required />
          <datalist id="year-form-options">
            {YEAR_FORM_OPTIONS.map((y) => (
              <option key={y} value={y} />
            ))}
          </datalist>
        </Field>
        <Field label="Nama Ibu Bapa / Penjaga" name="guardianName" required className="sm:col-span-2">
          <Input id="guardianName" name="guardianName" defaultValue={defaults.guardianName} required />
        </Field>
      </div>

      <fieldset>
        <legend className="text-[13px] font-medium text-ink-soft">Subjek Didaftarkan</legend>
        {visibleSubjects.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Tiada subjek. Tambah subjek di halaman Subjek Tuisyen.</p>
        ) : (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleSubjects.map((s) => (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm hover:bg-beige-50 has-checked:border-sage-300 has-checked:bg-sage-50"
              >
                <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={selected.has(s.id)} className="size-4 accent-sage-600" />
                {s.name}
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {parents && (
        <div className="grid gap-4 rounded-2xl bg-beige-50 p-4 sm:grid-cols-2">
          <Field label="Pautkan kepada ID Ibu Bapa (pilihan)" name="parentId" hint="Boleh juga dipautkan kemudian di Maklumat Ibu Bapa.">
            <Select id="parentId" name="parentId" defaultValue="">
              <option value="">— Tiada —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.parentCode} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Hubungan" name="relationship">
            <Select id="relationship" name="relationship" defaultValue="">
              <option value="">—</option>
              {RELATIONSHIP_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

      <Field label="Catatan (untuk admin sahaja)" name="notes">
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
