"use client";

import { useId, useState } from "react";
import { MessageCircleReply } from "lucide-react";
import { ActionForm, SubmitButton, useReadOnly } from "@/components/forms";
import { buttonClass, Textarea } from "@/components/ui";
import { REPLY_MAX } from "@/lib/constants";
import type { ActionState } from "@/lib/action-state";

/** "Balas" button that opens a small message box under a teacher comment. */
export function ReplyForm({
  action,
  placeholder = "Tulis balasan…",
  label = "Balas",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const fieldId = useId();
  const readOnly = useReadOnly();
  if (readOnly) return null;

  if (!open) {
    return (
      <button type="button" className={buttonClass("soft", "sm")} onClick={() => setOpen(true)}>
        <MessageCircleReply className="size-4" /> {label}
      </button>
    );
  }

  return (
    <ActionForm action={action} resetOnSuccess className="w-full" onSuccess={() => setOpen(false)}>
      <label className="sr-only" htmlFor={fieldId}>
        {label}
      </label>
      <Textarea
        id={fieldId}
        name="content"
        rows={3}
        maxLength={REPLY_MAX}
        placeholder={placeholder}
        autoFocus
        required
        className="text-base sm:text-sm"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" className={buttonClass("ghost", "sm")} onClick={() => setOpen(false)}>
          Batal
        </button>
        <SubmitButton size="sm" pendingText="Menghantar…">
          Hantar
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
