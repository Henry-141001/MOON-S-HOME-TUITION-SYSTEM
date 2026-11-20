// Server-safe presentational building blocks.
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ───────── Buttons ─────────

type Variant = "primary" | "secondary" | "ghost" | "danger" | "soft";
type Size = "sm" | "md" | "lg";

/**
 * Every variant has a visible shape (fill or border) so it reads as tappable on
 * phones, where there is no hover. All variants also react when pressed.
 */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap",
    "transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]",
    "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100",
    // Phones get taller hit areas (min. 36–48px); desktop stays compact.
    size === "sm" && "h-9 px-3.5 text-[13px] sm:h-8 sm:px-3",
    size === "md" && "h-11 px-4 text-sm sm:h-10",
    size === "lg" && "h-12 px-6 text-base",
    variant === "primary" && "bg-sage-600 text-white shadow-sm hover:bg-sage-700 active:bg-sage-800",
    variant === "secondary" && "border border-beige-300 bg-surface text-ink shadow-sm hover:bg-beige-50 active:bg-beige-100",
    variant === "soft" && "border border-sage-200 bg-sage-50 text-sage-700 hover:bg-sage-100 active:bg-sage-200",
    // "ghost" = small secondary action: outlined sage pill (never plain text).
    variant === "ghost" && "border border-sage-200 bg-surface text-sage-700 hover:bg-sage-50 active:bg-sage-100",
    variant === "danger" && "border border-rose-ink/30 bg-surface text-rose-ink hover:bg-rose-soft active:bg-rose-soft",
    extra,
  );
}

/** Inline text link that is visibly a link without hover (underlined, sage). */
export const linkClass =
  "font-medium text-sage-700 underline decoration-sage-300 decoration-1 underline-offset-4 hover:text-sage-800 hover:decoration-sage-600 active:text-sage-800";

export function ButtonLink({
  variant,
  size,
  className,
  arrow = false,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size; arrow?: boolean }) {
  return (
    <Link {...props} className={buttonClass(variant, size, className)}>
      {children}
      {arrow && <ChevronRight className="-mr-1 size-4" aria-hidden="true" />}
    </Link>
  );
}

/** Chevron shown at the end of a tappable row. */
export function RowChevron() {
  return <ChevronRight className="size-4 shrink-0 text-sage-500" aria-hidden="true" />;
}

// ───────── Layout ─────────

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }: ComponentProps<"section">) {
  return (
    <section
      {...rest}
      className={cn("rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-soft)]", className)}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        {icon && <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-50 text-sage-700">{icon}</span>}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("px-5 py-4", className)}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "sage",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "sage" | "beige" | "rose" | "amber" | "sky";
}) {
  const toneClass = {
    sage: "bg-sage-50 text-sage-700",
    beige: "bg-beige-100 text-ink-soft",
    rose: "bg-rose-soft text-rose-ink",
    amber: "bg-amber-soft text-amber-ink",
    sky: "bg-sky-soft text-sky-ink",
  }[tone];
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">{value}</p>
        </div>
        {icon && <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", toneClass)}>{icon}</span>}
      </div>
      {hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="mb-1 grid size-12 place-items-center rounded-full bg-beige-100">
        <MoonMark className="size-6 text-beige-300" />
      </div>
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-[13px] text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ───────── Tabs (link based, so they survive refresh) ─────────

/** Pill style shared by all tab bars: every tab looks tappable and they wrap on phones. */
export function tabPillClass(active: boolean) {
  return cn(
    "inline-flex h-9 select-none items-center whitespace-nowrap rounded-full px-4 text-sm transition-[background-color,color,transform] duration-150 active:scale-[0.97]",
    active
      ? "bg-sage-600 font-medium text-white shadow-sm"
      : "border border-beige-300 bg-surface text-ink-soft hover:bg-beige-50 active:bg-beige-100",
  );
}

export function TabLinks({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <nav className="no-print mb-6 flex flex-wrap gap-2" aria-label="Tab">
      {items.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.active ? "page" : undefined} className={tabPillClass(t.active)}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

// ───────── Badges ─────────

export type Tone = "sage" | "beige" | "rose" | "amber" | "sky" | "neutral";

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const toneClass = {
    sage: "bg-sage-50 text-sage-700 ring-sage-200",
    beige: "bg-beige-100 text-ink-soft ring-beige-200",
    rose: "bg-rose-soft text-rose-ink ring-rose-soft",
    amber: "bg-amber-soft text-amber-ink ring-amber-soft",
    sky: "bg-sky-soft text-sky-ink ring-sky-soft",
    neutral: "bg-beige-50 text-ink-soft ring-line",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export const attendanceTone: Record<string, Tone> = { PRESENT: "sage", ABSENT: "rose", EXCUSED: "amber" };
export const submissionTone: Record<string, Tone> = { PENDING: "amber", APPROVED: "sage", NEEDS_CORRECTION: "rose" };

export function DemoBadge() {
  return <Badge tone="sky">Demo</Badge>;
}

export function PercentPill({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return <span className="text-muted">—</span>;
  const tone: Tone = value >= 80 ? "sage" : value >= 50 ? "beige" : value >= 40 ? "amber" : "rose";
  return <Badge tone={tone}>{value.toFixed(1)}%</Badge>;
}

export function TrendText({ change }: { change: number | null }) {
  if (change === null) return <span className="text-xs text-muted">Tiada perbandingan</span>;
  if (change > 0) return <span className="text-xs font-medium text-sage-700">▲ +{change.toFixed(1)}%</span>;
  if (change < 0) return <span className="text-xs font-medium text-rose-ink">▼ {change.toFixed(1)}%</span>;
  return <span className="text-xs text-muted">● Tiada perubahan</span>;
}

// ───────── Tables ─────────

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("-mx-px overflow-x-auto", className)}>
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export const th = "border-b border-line bg-beige-50/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "border-b border-line px-4 py-3 align-middle text-ink";

// ───────── Form controls (plain, server-safe) ─────────

export const inputClass =
  // 16px text on phones: iOS Safari zooms the page in when a field with smaller text is tapped.
  "block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-base sm:text-sm text-ink placeholder:text-muted/70 transition-colors hover:border-beige-300 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-100 disabled:bg-beige-50 disabled:text-muted";

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}
export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={cn(inputClass, "pr-8", props.className)} />;
}
export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea rows={3} {...props} className={cn(inputClass, "min-h-[88px]", props.className)} />;
}

// ───────── Brand ─────────

export function MoonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path
        d="M20.5 4.5a12 12 0 1 0 7 19.8A10 10 0 0 1 20.5 4.5Z"
        fill="currentColor"
      />
      <circle cx="24.5" cy="9" r="1.4" fill="currentColor" opacity=".55" />
    </svg>
  );
}

/** The round Moons Home Tutor badge (public/brand/logo.png). */
export function BrandMark({ size = 40, className, priority = false }: { size?: number; className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/logo.png"
      alt="Logo Moons Home Tutor"
      width={size}
      height={size}
      priority={priority}
      className={cn("shrink-0 rounded-full shadow-sm ring-1 ring-black/5", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function BrandLogo({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark size={42} />
      <div className="leading-tight">
        <p className="font-display text-[15px] font-semibold tracking-wide text-ink">MOONS HOME TUTOR</p>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
