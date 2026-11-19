import Link from "next/link";
import { AlertTriangle, LogIn, ShieldCheck, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { APP_TIME_ZONE, formatDateTime, formatLongDate, isValidISODate, todayISO } from "@/lib/dates";
import { Badge, Card, CardHeader, EmptyState, Input, PageHeader, Select, StatCard, buttonClass, cn, type Tone } from "@/components/ui";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";

export const metadata = { title: "Log Aktiviti" };

const ROLE_LABEL: Record<Role, string> = { ADMIN: "Admin", PARENT: "Ibu Bapa", SUPER_ADMIN: "Pemerhati" };
const ROLE_TONE: Record<Role, Tone> = { ADMIN: "sage", PARENT: "beige", SUPER_ADMIN: "sky" };
const PAGE_SIZE = 100;

/** Start/end of a Malaysia calendar day as UTC instants. */
function dayRange(iso: string) {
  const start = new Date(`${iso}T00:00:00+08:00`);
  return { gte: start, lt: new Date(start.getTime() + 864e5) };
}

export default async function ActivityPage({ searchParams }: PageProps<"/admin/aktiviti">) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const role = sp.peranan === "ADMIN" || sp.peranan === "PARENT" || sp.peranan === "SUPER_ADMIN" || sp.peranan === "GAGAL" ? sp.peranan : "";
  const date = isValidISODate(sp.tarikh) ? sp.tarikh : "";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const page = Math.max(1, Number(sp.halaman) || 1);

  const where: Prisma.ActivityLogWhereInput = {
    ...(role === "GAGAL" ? { action: "login.failed" } : role ? { actorRole: role } : {}),
    ...(date ? { createdAt: dayRange(date) } : {}),
    ...(q
      ? { OR: [{ summary: { contains: q, mode: "insensitive" } }, { actorName: { contains: q, mode: "insensitive" } }] }
      : {}),
  };

  const today = dayRange(todayISO());
  const [logs, total, parentLoginsToday, adminChangesToday, failedToday, lastAdminLogin] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.count({ where: { actorRole: "PARENT", action: "login", createdAt: today } }),
    prisma.activityLog.count({ where: { actorRole: "ADMIN", action: { notIn: ["login", "logout"] }, createdAt: today } }),
    prisma.activityLog.count({ where: { action: "login.failed", createdAt: today } }),
    prisma.activityLog.findFirst({ where: { actorRole: "ADMIN", action: "login" }, orderBy: { createdAt: "desc" } }),
  ]);

  const qs = (overrides: Record<string, string | number>) => {
    const p = new URLSearchParams();
    const merged = { peranan: role, tarikh: date, q, ...overrides };
    for (const [k, v] of Object.entries(merged)) {
      if (String(v) === "" || (k === "halaman" && Number(v) === 1)) continue;
      p.set(k, String(v));
    }
    const s = p.toString();
    return `/admin/aktiviti${s ? `?${s}` : ""}`;
  };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Group by Malaysia calendar day for easier reading.
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE });
  const timeFmt = new Intl.DateTimeFormat("ms-MY", { hour: "numeric", minute: "2-digit", timeZone: APP_TIME_ZONE });
  const groups: { day: string; items: typeof logs }[] = [];
  for (const log of logs) {
    const day = dayKey.format(log.createdAt);
    if (groups.at(-1)?.day !== day) groups.push({ day, items: [] });
    groups.at(-1)!.items.push(log);
  }

  return (
    <>
      <PageHeader
        title="Log Aktiviti"
        description="Semua log masuk dan perubahan yang dibuat oleh admin dan ibu bapa. Hanya pemerhati boleh melihat halaman ini."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Ibu bapa log masuk hari ini" value={parentLoginsToday} icon={<Users className="size-5" />} />
        <StatCard label="Perubahan oleh admin hari ini" value={adminChangesToday} icon={<ShieldCheck className="size-5" />} tone="sky" />
        <StatCard
          label="Log masuk gagal hari ini"
          value={failedToday}
          icon={<AlertTriangle className="size-5" />}
          tone={failedToday > 0 ? "rose" : "beige"}
          hint={failedToday > 0 ? <Link href={qs({ peranan: "GAGAL", tarikh: todayISO(), halaman: 1 })} className="underline underline-offset-4">Lihat cubaan</Link> : undefined}
        />
        <StatCard
          label="Admin log masuk terakhir"
          value={<span className="text-base sm:text-lg">{lastAdminLogin ? formatDateTime(lastAdminLogin.createdAt) : "—"}</span>}
          icon={<LogIn className="size-5" />}
          tone="amber"
        />
      </div>

      <Card className="mt-6">
        <form className="grid gap-2 border-b border-line p-4 sm:grid-cols-[1fr_170px_170px_auto]" role="search">
          <Input name="q" defaultValue={q} placeholder="Cari aktiviti atau nama…" aria-label="Cari" />
          <Select name="peranan" defaultValue={role} aria-label="Peranan">
            <option value="">Semua peranan</option>
            <option value="ADMIN">Admin</option>
            <option value="PARENT">Ibu Bapa</option>
            <option value="SUPER_ADMIN">Pemerhati</option>
            <option value="GAGAL">Log masuk gagal</option>
          </Select>
          <Input type="date" name="tarikh" defaultValue={date} aria-label="Tarikh" />
          <div className="flex gap-2">
            <button type="submit" className={buttonClass("secondary")}>
              Tapis
            </button>
            {(role || date || q) && (
              <Link href="/admin/aktiviti" className={buttonClass("ghost")}>
                Set semula
              </Link>
            )}
          </div>
        </form>

        <CardHeader title={`${total} aktiviti`} description={pages > 1 ? `Halaman ${page} daripada ${pages}` : undefined} />

        {logs.length === 0 ? (
          <EmptyState title="Tiada aktiviti" description="Aktiviti akan direkodkan apabila admin atau ibu bapa log masuk dan membuat perubahan." />
        ) : (
          <div>
            {groups.map((g) => (
              <section key={g.day}>
                <h3 className="sticky top-0 border-b border-line bg-beige-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                  {formatLongDate(g.day)}
                </h3>
                <ul className="divide-y divide-line">
                  {g.items.map((log) => (
                    <li key={log.id} className="flex gap-3 px-5 py-3">
                      <time className="w-16 shrink-0 pt-0.5 text-xs tabular-nums text-muted">{timeFmt.format(log.createdAt)}</time>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {log.actorRole ? (
                            <Badge tone={ROLE_TONE[log.actorRole]}>{ROLE_LABEL[log.actorRole]}</Badge>
                          ) : (
                            <Badge tone="rose">Tidak dikenali</Badge>
                          )}
                          <span className="truncate text-sm font-medium text-ink">{log.actorName}</span>
                        </div>
                        <p className={cn("mt-1 text-sm", log.action === "login.failed" ? "text-rose-ink" : "text-ink-soft")}>
                          {log.summary}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
            {page > 1 ? (
              <Link href={qs({ halaman: page - 1 })} className={buttonClass("secondary", "sm")}>
                ‹ Lebih baharu
              </Link>
            ) : (
              <span />
            )}
            {page < pages && (
              <Link href={qs({ halaman: page + 1 })} className={buttonClass("secondary", "sm")}>
                Lebih lama ›
              </Link>
            )}
          </div>
        )}
      </Card>
    </>
  );
}
