import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Select, Textarea, Input } from "@/components/ui";
import { COMMENT_CATEGORIES, COMMENT_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

export function CommentForm({
  action,
  defaults = {},
  submitLabel,
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { category?: string; content?: string; commentDate?: string; isPublished?: boolean };
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  return (
    <ActionForm action={action} className="space-y-4" resetOnSuccess={resetOnSuccess}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori" name="category" required>
          <Select id="category" name="category" defaultValue={defaults.category ?? "ACADEMIC"} required>
            {COMMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {COMMENT_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tarikh" name="commentDate" required>
          <Input id="commentDate" name="commentDate" type="date" defaultValue={defaults.commentDate} required />
        </Field>
      </div>
      <Field label="Ulasan" name="content" required>
        <Textarea id="content" name="content" rows={5} defaultValue={defaults.content} placeholder="Tulis ulasan untuk ibu bapa…" required />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="isPublished" defaultChecked={defaults.isPublished ?? true} className="size-4 accent-sage-600" />
          Terbitkan kepada ibu bapa
        </label>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
