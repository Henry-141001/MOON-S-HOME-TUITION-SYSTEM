"use client";

import { useFormStatus } from "react-dom";
import { Eye, Loader2 } from "lucide-react";
import { buttonClass } from "@/components/ui";

/** Super admin only: opens this parent's portal in read-only mode. */
export function ObserveParentButton({ action, size = "sm" }: { action: () => Promise<void>; size?: "sm" | "md" }) {
  return (
    <form action={action}>
      <Inner size={size} />
    </form>
  );
}

function Inner({ size }: { size: "sm" | "md" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClass("soft", size)}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
      Lihat Portal
    </button>
  );
}
