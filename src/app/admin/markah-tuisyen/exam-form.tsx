import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input, Select, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

export function ExamForm({
  action,
  subjects,
  defaults = {},
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subjects: { id: string; name: string }[];
  defaults?: { name?: string; subjectId?: string; date?: string; remarks?: string | null };
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Field label="Nama ujian" name="name" required>
        <Input id="name" name="name" defaultValue={defaults.name} placeholder="cth. Ujian Topikal 3 — Pecahan" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Subjek" name="subjectId" required>
          <Select id="subjectId" name="subjectId" defaultValue={defaults.subjectId ?? ""} required>
            <option value="" disabled>
              Pilih subjek
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tarikh ujian" name="date" required>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </Field>
      </div>
      <p className="rounded-xl bg-sage-50 px-3.5 py-2.5 text-[13px] text-sage-700">
        Markah setiap murid dimasukkan dalam <strong>peratus (0–100%)</strong>.
      </p>
      <Field label="Catatan (pilihan)" name="remarks">
        <Textarea id="remarks" name="remarks" defaultValue={defaults.remarks ?? ""} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
