import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { addDaysISO, formatLongDate, isValidISODate, parseISODate, todayISO } from "@/lib/dates";
import { ButtonLink, Card, CardHeader, EmptyState, Input, buttonClass } from "@/components/ui";
import { saveAttendance } from "@/app/admin/_actions/attendance";
import { AttendanceSheet } from "./attendance-sheet";

export const metadata = { title: "Rekod Kehadiran" };

export default async function TakeAttendancePage({ searchParams }: PageProps<"/admin/kehadiran">) {
  await requireAdminView();
  const sp = await searchParams;
  const today = todayISO();
  const date = isValidISODate(sp.tarikh) ? sp.tarikh : today;
  const day = parseISODate(date);

  const [students, records, sessions] = await Promise.all([
    prisma.student.findMany({
      where: { isActive: true },
      orderBy: { studentCode: "asc" },
      select: { id: true, studentCode: true, fullName: true, isDemo: true },
    }),
    prisma.attendance.findMany({ where: { date: day }, select: { studentId: true, status: true, note: true } }),
    prisma.tuitionSession.findMany({ where: { date: day }, orderBy: { startTime: "asc" }, include: { subject: true } }),
  ]);
  const byStudent = new Map(records.map((r) => [r.studentId, r]));

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Tarikh sesi</p>
            <p className="font-display text-lg font-semibold text-ink">{formatLongDate(date)}</p>
            {date === today && <p className="text-xs text-navy-700">Hari ini</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/admin/kehadiran?tarikh=${addDaysISO(date, -1)}`} className={buttonClass("secondary", "sm")} aria-label="Hari sebelumnya">
              <ChevronLeft className="size-4" />
            </Link>
            <form className="flex items-center gap-2">
              <Input type="date" name="tarikh" defaultValue={date} className="w-40 py-1.5" aria-label="Pilih tarikh" />
              <button type="submit" className={buttonClass("secondary", "sm")}>
                Pergi
              </button>
            </form>
            <Link href={`/admin/kehadiran?tarikh=${addDaysISO(date, 1)}`} className={buttonClass("secondary", "sm")} aria-label="Hari seterusnya">
              <ChevronRight className="size-4" />
            </Link>
            {date !== today && (
              <ButtonLink href="/admin/kehadiran" variant="ghost" size="sm">
                Hari ini
              </ButtonLink>
            )}
          </div>
        </div>
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
            {sessions.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-beige-100 px-3 py-1 text-xs text-ink-soft">
                <CalendarClock className="size-3.5" /> {s.startTime}–{s.endTime} · {s.title}
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Jadual Kehadiran" description={`${students.length} murid aktif`} />
        {students.length === 0 ? (
          <EmptyState title="Tiada murid aktif" action={<ButtonLink href="/admin/murid/baru" variant="soft" size="sm">Tambah murid</ButtonLink>} />
        ) : (
          <AttendanceSheet
            key={date}
            action={saveAttendance.bind(null, date)}
            alreadyRecorded={records.length > 0}
            rows={students.map((s) => ({
              id: s.id,
              code: s.studentCode,
              name: s.fullName,
              isDemo: s.isDemo,
              status: byStudent.get(s.id)?.status ?? "",
              note: byStudent.get(s.id)?.note ?? "",
            }))}
          />
        )}
      </Card>
    </div>
  );
}
