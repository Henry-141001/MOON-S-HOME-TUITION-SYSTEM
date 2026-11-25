"use client";

import { useActionState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/components/ui";
import { useReadOnly } from "@/components/forms";
import { PAYMENT_LABELS, PAYMENT_STATUSES, type PaymentStatusValue } from "@/lib/constants";
import { initialState, type ActionState } from "@/lib/action-state";

const TONE: Record<PaymentStatusValue, string> = {
  PAID: "border-success-ring bg-success-soft text-success-ink",
  UNPAID: "border-amber-ink/30 bg-amber-soft text-amber-ink",
  OVERDUE: "border-rose-ink/30 bg-rose-soft text-rose-ink",
};

/** Status Bayaran picker: saves as soon as a new status is chosen. Read-only for the observer. */
export function FeeStatusSelect({
  action,
  status,
  label,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  status: PaymentStatusValue;
  label: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const readOnly = useReadOnly();

  if (readOnly) {
    return <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", TONE[status])}>{PAYMENT_LABELS[status]}</span>;
  }

  return (
    <form ref={formRef} action={formAction} className="inline-flex flex-col items-start gap-1">
      <span className="inline-flex items-center gap-1.5">
        <select
          name="status"
          defaultValue={status}
          key={status}
          aria-label={label}
          disabled={pending}
          onChange={() => formRef.current?.requestSubmit()}
          className={cn("min-h-9 rounded-full border px-3 py-1 text-base font-semibold sm:text-xs", TONE[status])}
        >
          {PAYMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PAYMENT_LABELS[s]}
            </option>
          ))}
        </select>
        {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="Menyimpan" />}
      </span>
      {/* Without JavaScript the select cannot save by itself, so offer a button. */}
      <noscript>
        <button type="submit" className="text-xs underline">
          Simpan
        </button>
      </noscript>
      {state.status === "error" && state.message && <span className="text-xs text-rose-ink">{state.message}</span>}
    </form>
  );
}
