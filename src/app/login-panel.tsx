"use client";

import { useActionState, useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck, Users } from "lucide-react";
import { adminLogin, parentLogin } from "@/app/actions/auth";
import { SubmitButton } from "@/components/forms";
import { cn, Input } from "@/components/ui";
import { initialState } from "@/lib/action-state";

export function LoginPanel({ initialTab }: { initialTab: "admin" | "parent" }) {
  const [tab, setTab] = useState<"admin" | "parent">(initialTab);

  return (
    <div className="mt-7">
      <div role="tablist" className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-beige-50 p-1">
        <TabButton active={tab === "parent"} onClick={() => setTab("parent")} icon={<Users className="size-4" />}>
          Log Masuk Ibu Bapa
        </TabButton>
        <TabButton active={tab === "admin"} onClick={() => setTab("admin")} icon={<ShieldCheck className="size-4" />}>
          Log Masuk Admin
        </TabButton>
      </div>
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
        {tab === "parent" ? <ParentForm /> : <AdminForm />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-[13px] font-medium transition-colors sm:text-sm",
        active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm text-rose-ink">
      <AlertCircle className="mt-0.5 size-4 shrink-0" />
      {message}
    </div>
  );
}

function ParentForm() {
  const [state, action] = useActionState(parentLogin, initialState);
  const [code, setCode] = useState("");
  const needPin = state.needPin === true;

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="parentCode" className="text-sm font-medium text-ink">
          ID Ibu Bapa
        </label>
        <Input
          id="parentCode"
          name="parentCode"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Contoh: MHT001-K7QX"
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          required
          readOnly={needPin}
          className="mt-1.5 h-12 text-base tracking-wider"
        />
        <p className="mt-1.5 text-xs text-muted">ID ini diberikan oleh guru tuisyen anak anda.</p>
      </div>

      {needPin && (
        <div>
          <label htmlFor="pin" className="text-sm font-medium text-ink">
            PIN
          </label>
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            autoFocus
            className="mt-1.5 h-12 text-base tracking-[0.3em]"
          />
          <button type="button" className="mt-1.5 text-xs text-sage-700 underline" onClick={() => window.location.reload()}>
            Guna ID lain
          </button>
        </div>
      )}

      <ErrorBox message={state.status === "error" ? state.message : undefined} />
      <SubmitButton size="lg" className="w-full" pendingText="Menyemak…">
        <KeyRound className="size-4" /> Masuk
      </SubmitButton>
    </form>
  );
}

function AdminForm() {
  const [state, action] = useActionState(adminLogin, initialState);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="loginId" className="text-sm font-medium text-ink">
          ID Admin
        </label>
        <Input id="loginId" name="loginId" autoComplete="username" required className="mt-1.5 h-12" spellCheck={false} />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-ink">
          Kata Laluan
        </label>
        <Input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1.5 h-12" />
      </div>
      <ErrorBox message={state.status === "error" ? state.message : undefined} />
      <SubmitButton size="lg" className="w-full" pendingText="Menyemak…">
        <ShieldCheck className="size-4" /> Log Masuk Admin
      </SubmitButton>
    </form>
  );
}
