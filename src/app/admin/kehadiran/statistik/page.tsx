import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatMonth, monthBounds, parseISODate, toISODate } from "@/lib/dates";
import { attendanceCounts, monthlyAttendance } from "@/lib/analytics";
import { AttendanceChart } from "@/components/charts";
import { Card, CardBody, CardHeader, EmptyState, Input, PercentPill, Table, buttonClass, cn, linkClass, td, th } from "@/components/ui";

export const metadata = { title: "Statistik Kehadiran" };

export default async function AttendanceStatsPage({ searchParams }: PageProps<"/admin/kehadiran/statistik">) {
  await requireAdminView();
  const sp = await searchParams;
  const month = typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : "";

  const range = month ? monthBounds(month) : null;
  const [students, records] = await Promise.all([
    prisma.student.findMany({ where: { isActive: true }, orderBy: { studentCode: "asc" }, select: { id: true, studentCode: true, fullName: true } }),
    prisma.attendance.findMany({
      where: {
        student: { isActive: true },
        ...(range ? { date: { gte: parseISODate(range.start), lte: parseISODate(range.end) } } : {}),
      },
      select: { studentId: true, date: true, status: true },
    }),
  ]);

  const rowsFor = (id: string) => records.filter((r) => r.studentId === id);
  const months = monthlyAttendance(records.map((r) => ({ date: toISODate(r.date), status: r.status })));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={month ? `Statistik Murid — ${formatMonth(month)}` : "Statistik Murid — Keseluruhan"}
          description="Peratus = hadir ÷ (hadir + tidak hadir). Ketidakhadiran bersebab tidak dikira."
          actions={
            <form className="flex items-center gap-2">
              <Input type="month" name="bulan" defaultValue={month} className="w-40 py-1.5" aria-label="Bulan" />
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Papar
              </button>
              {month && (
                <Link href="/admin/kehadiran/statistik" className={buttonClass("ghost", "sm")}>
                  Keseluruhan
                </Link>
              )}
            </form>
          }
        />
        {students.length === 0 ? (
          <EmptyState title="Tiada murid aktif" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>ID Murid</th>
                <th className={th}>Nama Murid</th>
                <th className={th}>Kelas Dihadiri</th>
                <th className={th}>Tidak Hadir</th>
                <th className={th}>Bersebab</th>
                <th className={th}>Peratus Kehadiran</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const c = attendanceCounts(rowsFor(s.id));
                return (
                  <tr key={s.id}>
                    <td className={cn(td, "font-mono text-xs")}>{s.studentCode}</td>
                    <td className={td}>
                      <Link href={`/admin/murid/${s.id}?tab=kehadiran`} className={linkClass}>
                        {s.fullName}
                      </Link>
                    </td>
                    <td className={td}>{c.present}</td>
                    <td className={td}>{c.absent}</td>
                    <td className={td}>{c.excused}</td>
                    <td className={td}>
                      <PercentPill value={c.percent} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {!month && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader title="Ringkasan Bulanan" description="Semua murid aktif" />
            <CardBody>
              <AttendanceChart
                data={[...months].slice(0, 6).reverse().map((m) => ({
                  label: formatMonth(m.month).replace(/ \d{4}$/, ""),
                  present: m.present,
                  absent: m.absent,
                  excused: m.excused,
                }))}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Jadual Bulanan" />
            {months.length === 0 ? (
              <EmptyState title="Belum ada rekod kehadiran" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <th className={th}>Bulan</th>
                    <th className={th}>Hadir</th>
                    <th className={th}>Tidak Hadir</th>
                    <th className={th}>Bersebab</th>
                    <th className={th}>Peratus</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map((m) => (
                    <tr key={m.month}>
                      <td className={td}>
                        <Link href={`/admin/kehadiran/statistik?bulan=${m.month}`} className={linkClass}>
                          {formatMonth(m.month)}
                        </Link>
                      </td>
                      <td className={td}>{m.present}</td>
                      <td className={td}>{m.absent}</td>
                      <td className={td}>{m.excused}</td>
                      <td className={td}>
                        <PercentPill value={m.percent} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
