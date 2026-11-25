import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireParentForSetup } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { BrandMark } from "@/components/ui";
import { BRAND_NAME, CONSENT_CHECKBOX, CONSENT_PARAGRAPHS, CONSENT_TITLE } from "@/lib/constants";
import { ConsentStep, NameStep } from "./steps";

export const metadata = { title: "Selamat Datang" };

/**
 * First login for a parent: 1) Nama Panggilan / Samaran, 2) tick and agree.
 * There is no way around it — every parent page and action sends the parent
 * back here until both steps are done. After that this page is never shown again.
 */
export default async function ParentSetupPage() {
  const session = await requireParentForSetup();
  const parent = await prisma.parent.findUniqueOrThrow({
    where: { id: session.id },
    select: { parentCode: true, name: true, nameConfirmedAt: true, consentAt: true },
  });
  if (parent.consentAt) redirect("/ibu-bapa");
  const step = parent.nameConfirmedAt ? 2 : 1;

  return (
    <div className="min-h-dvh bg-cream px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg">
        <div className="flex flex-col items-center text-center">
          <BrandMark size={84} priority className="ring-4 ring-gold-300/60" />
          <p className="mt-3 font-display text-lg font-semibold tracking-wide text-ink">{BRAND_NAME}</p>
        </div>

        <ol className="mt-6 flex items-center justify-center gap-2 text-xs font-medium" aria-label="Langkah">
          <StepDot n={1} label="Nama" current={step} />
          <span className="h-px w-8 bg-line" aria-hidden />
          <StepDot n={2} label="Persetujuan" current={step} />
        </ol>

        <div className="mt-5 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)]">
          {step === 1 ? (
            <>
              <h1 className="font-display text-2xl font-semibold text-ink">Selamat datang!</h1>
              <p className="mt-1 text-[15px] text-ink-soft">Sila kemaskini nama anda.</p>
              <NameStep defaultName={parent.name} />
            </>
          ) : (
            <>
              <h1 className="font-display text-xl font-semibold leading-snug text-ink">{CONSENT_TITLE}</h1>
              <p className="mt-1 text-sm text-muted">
                {parent.name} · ID {parent.parentCode}
              </p>
              <div className="mt-4 space-y-3 rounded-2xl border border-line bg-beige-50/60 p-4 text-[15px] leading-relaxed text-ink">
                {CONSENT_PARAGRAPHS.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
              <ConsentStep checkboxLabel={CONSENT_CHECKBOX} />
            </>
          )}
        </div>

        <form action={logout} className="mt-6 text-center">
          <button type="submit" className="text-xs text-muted underline underline-offset-2">
            Bukan akaun anda? Log keluar
          </button>
        </form>
      </div>
    </div>
  );
}

function StepDot({ n, label, current }: { n: number; label: string; current: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <li className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
      <span
        className={
          done
            ? "grid size-6 place-items-center rounded-full bg-success-ink text-white"
            : active
              ? "grid size-6 place-items-center rounded-full bg-navy-600 text-white"
              : "grid size-6 place-items-center rounded-full bg-beige-100 text-muted"
        }
      >
        {done ? "✓" : n}
      </span>
      <span className={active ? "text-ink" : "text-muted"}>{label}</span>
    </li>
  );
}
