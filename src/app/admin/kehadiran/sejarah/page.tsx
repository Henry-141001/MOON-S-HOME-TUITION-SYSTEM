import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatLongDate, formatMonth, monthBounds, parseISODate, todayISO, toISODate } from "@/lib/dates";
import { attendanceCounts } from "@/lib/analytics";
import { Card, CardHeader, EmptyState, Input, PercentPill, Table, buttonClass, cn, td, th } from "@/components/ui";

export const metadata = { title: "Sejarah Kehadiran" };

export default async function AttendanceHistoryPage({ searchParams }: PageProps<"/admin/kehadiran/sejarah">) {
  await requireAdmin();
  const sp = await searchParams;
  const month = typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : todayISO().slice(0, 7);
  const { start, end } = monthBounds(month);

  const records = await prisma.attendance.findMany({
    where: { date: { gte: parseISODate(start), lte: parseISODate(end) } },
    orderBy: { date: "desc" },
    select: { date: true, status: true, student: { select: { fullName: true } } },
  });

  const byDate = new Map<string, { status: string; name: string }[]>();
  for (const r of records) {
    const key = toISODate(r.date);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push({ status: r.status, name: r.student.fullName });
  }

  return (
    <Card>
      <CardHeader
        title={`Sejarah Kehadiran — ${formatMonth(month)}`}
        description={`${byDate.size} sesi direkod`}
        actions={
          <form className="flex items-center gap-2">
            <Input type="month" name="bulan" defaultValue={month} className="w-40 py-1.5" aria-label="Bulan" />
            <button type="submit" className={buttonClass("secondary", "sm")}>
              Papar
            </button>
          </form>
        }
      />
      {byDate.size === 0 ? (
        <EmptyState title="Tiada rekod kehadiran untuk bulan ini" />
      ) : (
        <Table>
          <thead>
            <tr>
              <th className={th}>Tarikh</th>
              <th className={th}>Hadir</th>
              <th className={th}>Tidak Hadir</th>
              <th className={th}>Bersebab</th>
              <th className={th}>Peratus</th>
              <th className={th}>Murid tidak hadir</th>
              <th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {[...byDate.entries()].map(([date, rows]) => {
              const c = attendanceCounts(rows);
              const missing = rows.filter((r) => r.status !== "PRESENT").map((r) => r.name);
              return (
                <tr key={date}>
                  <td className={cn(td, "whitespace-nowrap font-medium")}>{formatLongDate(date)}</td>
                  <td className={td}>{c.present}</td>
                  <td className={td}>{c.absent}</td>
                  <td className={td}>{c.excused}</td>
                  <td className={td}>
                    <PercentPill value={c.percent} />
                  </td>
                  <td className={cn(td, "max-w-64 text-xs text-ink-soft")}>{missing.length ? missing.join(", ") : "—"}</td>
                  <td className={cn(td, "text-right")}>
                    <Link href={`/admin/kehadiran?tarikh=${date}`} className={buttonClass("ghost", "sm")}>
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
