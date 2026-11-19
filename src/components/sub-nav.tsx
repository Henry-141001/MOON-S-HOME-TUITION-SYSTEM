"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { tabPillClass } from "@/components/ui";

/** Section tabs (pill buttons that wrap on phones), highlighted from the current path. */
export function SubNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="no-print mb-6 flex flex-wrap gap-2" aria-label="Sub navigasi">
      {items.map((t, i) => {
        const active = i === 0 ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className={tabPillClass(active)}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
