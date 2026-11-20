"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyCode({ code, large = false }: { code: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Salin ID"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable — the code is still visible to copy manually */
        }
      }}
      className={
        large
          ? "inline-flex items-center gap-2 rounded-2xl border border-navy-200 bg-navy-50 px-4 py-2.5 font-mono text-xl font-semibold tracking-wider text-navy-800 hover:bg-navy-100"
          : "inline-flex items-center gap-1.5 rounded-lg bg-beige-50 px-2 py-1 font-mono text-[13px] font-medium text-ink hover:bg-beige-100"
      }
    >
      {code}
      {copied ? <Check className="size-3.5 text-navy-600" /> : <Copy className="size-3.5 text-muted" />}
    </button>
  );
}
