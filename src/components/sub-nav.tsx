"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";

/** Section tabs that highlight based on the current path. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="no-print -mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line px-1" aria-label="Sub navigasi">
      {items.map((t, i) => {
        const active = i === 0 ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm transition-colors",
              active ? "border-sage-600 font-medium text-sage-700" : "border-transparent text-muted hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
