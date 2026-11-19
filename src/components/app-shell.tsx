"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { signalNavigationStart } from "@/components/navigation-progress";
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  MessageSquareText,
  School,
  Settings,
  Trophy,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { BrandLogo, cn } from "@/components/ui";

const ICONS = {
  dashboard: LayoutDashboard,
  students: GraduationCap,
  parents: Users,
  subjects: BookOpen,
  attendance: CalendarCheck,
  tuition: ClipboardList,
  comments: MessageSquareText,
  school: School,
  reports: FileText,
  settings: Settings,
  profile: UserRound,
  achievement: Trophy,
  analysis: LineChart,
  chart: BarChart3,
} as const;

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean; badge?: number };

export function AppShell({
  nav,
  portalLabel,
  userName,
  userMeta,
  logoutAction,
  childSwitcher,
  children,
}: {
  nav: NavItem[];
  portalLabel: string;
  userName: string;
  userMeta: string;
  logoutAction: () => Promise<void>;
  childSwitcher?: { id: string; name: string; code: string }[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  // Parents: keep the selected child (?m=) when moving between pages.
  const childParam = searchParams.get("m");
  const withChild = (href: string) => (childSwitcher && childParam ? `${href}?m=${childParam}` : href);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-6">
        <BrandLogo subtitle={portalLabel} />
      </div>
      {childSwitcher && childSwitcher.length > 0 && <ChildSwitcher items={childSwitcher} />}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4" aria-label="Navigasi utama">
        {nav.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={withChild(item.href)}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active ? "bg-sage-600 font-medium text-white" : "text-ink-soft hover:bg-beige-100 hover:text-ink",
              )}
            >
              <Icon className="size-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              <NavPending />
              {item.badge ? (
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-[11px] font-semibold leading-5",
                    active ? "bg-white/20 text-white" : "bg-amber-soft text-amber-ink",
                  )}
                >
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-beige-100 text-sm font-semibold text-ink-soft">
            {userName.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-ink">{userName}</p>
            <p className="truncate text-xs text-muted">{userMeta}</p>
          </div>
        </div>
        <form action={logoutAction}>
          <LogoutButton />
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-72">
      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 hidden w-72 border-r border-line bg-beige-50/70 lg:block">{sidebar}</aside>

      {/* Mobile top bar */}
      <header className="no-print sticky top-0 z-30 flex items-center justify-between border-b border-line bg-cream/90 px-4 py-3 backdrop-blur lg:hidden">
        <BrandLogo />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border border-line bg-surface p-2 text-ink-soft"
          aria-label="Buka menu"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} aria-label="Tutup menu" />
          <aside className="absolute inset-y-0 left-0 w-[84%] max-w-80 bg-cream shadow-xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-5 rounded-full p-1.5 text-muted hover:bg-beige-100"
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <main className="print-full mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-9">{children}</main>
    </div>
  );
}

function LogoutButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-ink-soft hover:bg-beige-100 disabled:opacity-60"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {pending ? "Sedang log keluar…" : "Log Keluar"}
    </button>
  );
}

/** Spinner inside a sidebar link while its page is loading (fixed size, no layout shift). */
function NavPending() {
  const { pending } = useLinkStatus();
  return (
    <Loader2
      aria-hidden="true"
      className={cn("size-4 shrink-0 animate-spin transition-opacity", pending ? "opacity-70" : "opacity-0")}
    />
  );
}

function ChildSwitcher({ items }: { items: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("m") ?? items[0]?.id;
  const [switching, startSwitch] = useTransition();

  if (items.length === 1) {
    return (
      <div className="mx-3 mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Anak anda</p>
        <p className="mt-0.5 truncate text-sm font-medium text-ink">{items[0].name}</p>
      </div>
    );
  }
  return (
    <div className="mx-3 mb-4 rounded-2xl border border-line bg-surface px-4 py-3">
      <label htmlFor="child-switcher" className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
        Pilih anak ({items.length})
        {switching && <Loader2 className="size-3 animate-spin" aria-label="Memuatkan" />}
      </label>
      <select
        id="child-switcher"
        value={current}
        disabled={switching}
        onChange={(e) => {
          const href = `${pathname}?m=${e.target.value}`;
          signalNavigationStart();
          startSwitch(() => router.push(href));
        }}
        className="mt-1 block w-full rounded-lg border border-line bg-cream px-2 py-1.5 text-base font-medium text-ink sm:text-sm"
      >
        {items.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.code})
          </option>
        ))}
      </select>
    </div>
  );
}
