"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { Input } from "@/components/ui";
import { confirmParentName, giveConsent } from "./actions";

export function NameStep({ defaultName }: { defaultName: string }) {
  return (
    <ActionForm action={confirmParentName} className="mt-5 space-y-4" showSuccess={false}>
      <Field label="Nama Panggilan / Samaran" name="name" required>
        <Input
          id="name"
          name="name"
          defaultValue={defaultName}
          autoComplete="nickname"
          required
          minLength={2}
          maxLength={120}
          className="h-12 text-base"
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Menyimpan…">
        Simpan &amp; Teruskan <ArrowRight className="size-4" />
      </SubmitButton>
    </ActionForm>
  );
}

export function ConsentStep({ checkboxLabel }: { checkboxLabel: string }) {
  const [agreed, setAgreed] = useState(false);
  return (
    <ActionForm action={giveConsent} className="mt-4 space-y-4" showSuccess={false}>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 text-[15px] text-ink has-checked:border-navy-300 has-checked:bg-navy-50">
        <input
          type="checkbox"
          name="agree"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 size-5 shrink-0 accent-navy-600"
        />
        <span>{checkboxLabel}</span>
      </label>
      <SubmitButton size="lg" className="w-full" disabled={!agreed} pendingText="Menyimpan…">
        <CheckCircle2 className="size-4" /> Setuju &amp; Teruskan
      </SubmitButton>
    </ActionForm>
  );
}
