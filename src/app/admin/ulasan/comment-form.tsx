"use client";

import { useState } from "react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Select, Textarea, Input } from "@/components/ui";
import { PhotoField } from "@/components/photo-field";
import { COMMENT_CATEGORIES, COMMENT_LABELS } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

/** One tuition test the student has a mark for (choices for a "Keputusan Ujian" comment). */
export type ExamOption = { id: string; label: string };

export function CommentForm({
  action,
  defaults = {},
  exams,
  submitLabel,
  resetOnSuccess = false,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: {
    category?: string;
    content?: string;
    commentDate?: string;
    isPublished?: boolean;
    tuitionExamId?: string | null;
    /** URL of the comment's current picture, if any (edit form). */
    photoUrl?: string | null;
  };
  exams: ExamOption[];
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const [category, setCategory] = useState(defaults.category ?? "ACADEMIC");
  const isExam = category === "EXAM_RESULT";

  return (
    <ActionForm
      action={action}
      className="space-y-4"
      resetOnSuccess={resetOnSuccess}
      // The form reset puts the select back to its default, so keep the picker in step.
      onSuccess={resetOnSuccess ? () => setCategory(defaults.category ?? "ACADEMIC") : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kategori" name="category" required>
          <Select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} required>
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
      {isExam && (
        <Field
          label="Ujian yang diulas"
          name="tuitionExamId"
          required
          hint={exams.length === 0 ? "Murid ini belum ada markah ujian tuisyen. Masukkan markah dahulu." : "Markah ujian ini akan dipaparkan bersama ulasan."}
        >
          <Select id="tuitionExamId" name="tuitionExamId" defaultValue={defaults.tuitionExamId ?? ""} required>
            <option value="" disabled>
              Pilih ujian…
            </option>
            {exams.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Ulasan" name="content" required>
        <Textarea
          id="content"
          name="content"
          rows={5}
          defaultValue={defaults.content}
          placeholder={isExam ? "Contoh: Prestasi meningkat dalam topik pecahan, perlu lebih latihan soalan KBAT…" : "Tulis ulasan untuk ibu bapa…"}
          required
        />
      </Field>
      <PhotoField existingUrl={defaults.photoUrl} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" name="isPublished" defaultChecked={defaults.isPublished ?? true} className="size-4 accent-navy-600" />
          Terbitkan kepada ibu bapa
        </label>
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
