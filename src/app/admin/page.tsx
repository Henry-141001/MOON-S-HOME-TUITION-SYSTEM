import Link from "next/link";
import { CalendarCheck, CalendarClock, CalendarX, ChevronRight, ClipboardCheck, GraduationCap, Percent } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { todayISO, parseISODate, toISODate, formatDate, formatLongDate, formatShortDate } from "@/lib/dates";
import { attendanceCounts, average, percent } from "@/lib/analytics";
import { COMMENT_LABELS, SUBMISSION_LABELS } from "@/lib/constants";
import { schoolExamTitle } from "@/lib/records";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageHeader,
  PercentPill,
  RowChevron,
  StatCard,
  buttonClass,
  linkClass,
  submissionTone,
} from "@/components/ui";
import { AttendanceChart, PercentBarChart } from "@/components/charts";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const admin = await requireAdminView();
  const today = todayISO();
  const todayDate = parseISODate(today);
  const activeStudent = { student: { isActive: true } };

  const [studentCount, todayAttendance, allAttendance, recentDates, tuitionRecent, tuitionAll, submissions, upcoming, comments, pendingCount] =
    await Promise.all([
      prisma.student.count({ where: { isActive: true } }),
      prisma.attendance.findMany({ where: { date: todayDate, ...activeStudent }, select: { status: true } }),
      prisma.attendance.findMany({ where: activeStudent, select: { status: true } }),
      prisma.attendance.groupBy({ by: ["date"], orderBy: { date: "desc" }, take: 8 }),
      prisma.tuitionResult.findMany({
        where: activeStudent,
        orderBy: [{ exam: { date: "desc" } }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          marksObtained: true,
          student: { select: { id: true, fullName: true } },
          exam: { select: { id: true, name: true, date: true, totalMarks: true, subject: { select: { name: true } } } },
        },
      }),
      prisma.tuitionResult.findMany({
        where: activeStudent,
        select: { marksObtained: true, exam: { select: { totalMarks: true, subject: { select: { name: true } } } } },
      }),
      prisma.schoolExamination.findMany({
        where: activeStudent,
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          examType: true,
          examName: true,
          examDate: true,
          status: true,
          createdAt: true,
          student: { select: { fullName: true } },
          results: { select: { marksObtained: true, totalMarks: true } },
        },
      }),
      prisma.tuitionSession.findMany({
        where: { date: { gte: todayDate } },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        take: 5,
        include: { subject: { select: { name: true } } },
      }),
      prisma.teacherComment.findMany({
        where: activeStudent,
        orderBy: [{ commentDate: "desc" }, { createdAt: "desc" }],
        take: 4,
        select: { id: true, category: true, content: true, commentDate: true, student: { select: { id: true, fullName: true } } },
      }),
      prisma.schoolExamination.count({ where: { status: "PENDING", ...activeStudent } }),
    ]);

  const todayCounts = attendanceCounts(todayAttendance);
  const overall = attendanceCounts(allAttendance);

  // Attendance for the last 8 recorded dates (oldest → newest).
  const dates = recentDates.map((d) => d.date);
  const perDate = dates.length
    ? await prisma.attendance.groupBy({
        by: ["date", "status"],
        where: { date: { in: dates }, ...activeStudent },
        _count: { _all: true },
      })
    : [];
  const attendanceChart = [...dates].reverse().map((d) => {
    const rows = perDate.filter((r) => r.date.getTime() === d.getTime());
    const count = (s: string) => rows.find((r) => r.status === s)?._count._all ?? 0;
    return { label: formatShortDate(d), present: count("PRESENT"), absent: count("ABSENT"), excused: count("EXCUSED") };
  });

  // Average tuition percentage by subject (all active students).
  const bySubject = new Map<string, number[]>();
  for (const r of tuitionAll) {
    const list = bySubject.get(r.exam.subject.name) ?? [];
    list.push(percent(r.marksObtained, r.exam.totalMarks));
    bySubject.set(r.exam.subject.name, list);
  }
  const subjectChart = [...bySubject.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, values]) => ({ name, average: average(values) }));

  return (
    <>
      <PageHeader
        title={`Selamat datang, ${admin.name}`}
        description={formatLongDate(today)}
        actions={
          <>
            <ButtonLink href="/admin/kehadiran" variant="primary">
              <CalendarCheck className="size-4" /> {admin.readOnly ? "Lihat Kehadiran" : "Ambil Kehadiran"}
            </ButtonLink>
            <ButtonLink href="/admin/markah-tuisyen" variant="secondary">
              {admin.readOnly ? "Lihat Markah" : "Masukkan Markah"}
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Jumlah Murid Aktif"
          value={studentCount}
          icon={<GraduationCap className="size-5" />}
          hint={<Link href="/admin/murid" className={linkClass}>Lihat semua murid</Link>}
        />
        <StatCard
          label="Hadir Hari Ini"
          value={todayCounts.present}
          icon={<CalendarCheck className="size-5" />}
          tone="sage"
          hint={todayCounts.total === 0 ? "Kehadiran hari ini belum direkod" : `daripada ${todayCounts.total} direkod`}
        />
        <StatCard
          label="Tidak Hadir Hari Ini"
          value={todayCounts.absent + todayCounts.excused}
          icon={<CalendarX className="size-5" />}
          tone="rose"
          hint={todayCounts.excused ? `${todayCounts.excused} bersebab` : undefined}
        />
        <StatCard
          label="Peratus Kehadiran Keseluruhan"
          value={overall.percent === null ? "—" : `${overall.percent}%`}
          icon={<Percent className="size-5" />}
          tone="sky"
          hint={`${overall.total} rekod kehadiran`}
        />
      </div>

      {pendingCount > 0 && (
        <Link
          href="/admin/keputusan-sekolah?status=PENDING"
          className="mt-4 flex items-center gap-3 rounded-2xl border border-amber-soft bg-amber-soft/60 px-4 py-3 text-sm text-amber-ink hover:bg-amber-soft"
        >
          <ClipboardCheck className="size-5 shrink-0" />
          <span className="flex-1">
            <strong>{pendingCount}</strong> keputusan peperiksaan sekolah daripada ibu bapa sedang menunggu semakan anda.
          </span>
          <span className={buttonClass("secondary", "sm", "shrink-0 border-amber-ink/30 text-amber-ink")}>
            Semak <ChevronRight className="-mr-1 size-4" />
          </span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Kehadiran Sesi Terkini" description="8 tarikh kehadiran terakhir yang direkod" />
          <CardBody>
            <AttendanceChart data={attendanceChart} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Purata Ujian Tuisyen Mengikut Subjek" description="Semua murid aktif" />
          <CardBody>
            <PercentBarChart data={subjectChart} bars={[{ key: "average", label: "Purata" }]} emptyText="Belum ada markah ujian tuisyen." />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Keputusan Ujian Tuisyen Terkini"
            actions={<ButtonLink href="/admin/markah-tuisyen" variant="ghost" size="sm" arrow>Lihat semua</ButtonLink>}
          />
          {tuitionRecent.length === 0 ? (
            <EmptyState title="Belum ada markah ujian tuisyen" />
          ) : (
            <ul className="divide-y divide-line">
              {tuitionRecent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/admin/markah-tuisyen/${r.exam.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-beige-50 active:bg-beige-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.student.fullName}</p>
                      <p className="truncate text-xs text-muted">
                        {r.exam.subject.name} · {r.exam.name} · {formatDate(r.exam.date)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm">
                      <PercentPill value={percent(r.marksObtained, r.exam.totalMarks)} />
                      <RowChevron />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Sesi Tuisyen Akan Datang"
            icon={<CalendarClock className="size-4" />}
            actions={<ButtonLink href="/admin/kehadiran/jadual" variant="ghost" size="sm" arrow>Urus</ButtonLink>}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              title="Tiada sesi dijadualkan"
              action={<ButtonLink href="/admin/kehadiran/jadual" variant="soft" size="sm">Jadualkan sesi</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.map((s) => (
                <li key={s.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="w-12 shrink-0 rounded-xl bg-beige-100 py-1.5 text-center">
                    <p className="text-[11px] uppercase text-muted">{formatShortDate(s.date).split(" ")[1]}</p>
                    <p className="text-base font-semibold leading-none text-ink">{toISODate(s.date).slice(8)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                    <p className="text-xs text-muted">
                      {s.startTime}–{s.endTime}
                      {s.subject ? ` · ${s.subject.name}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Keputusan Sekolah Dihantar Ibu Bapa"
            actions={<ButtonLink href="/admin/keputusan-sekolah" variant="ghost" size="sm" arrow>Lihat semua</ButtonLink>}
          />
          {submissions.length === 0 ? (
            <EmptyState title="Belum ada keputusan dihantar" />
          ) : (
            <ul className="divide-y divide-line">
              {submissions.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/admin/keputusan-sekolah/${s.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-beige-50 active:bg-beige-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{s.student.fullName}</p>
                      <p className="truncate text-xs text-muted">
                        {schoolExamTitle(s.examType, s.examName)} · {formatDate(s.examDate)}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                        <PercentPill value={average(s.results.map((r) => percent(r.marksObtained, r.totalMarks)))} />
                        <Badge tone={submissionTone[s.status]}>{SUBMISSION_LABELS[s.status]}</Badge>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="hidden items-center gap-2 sm:flex">
                        <PercentPill value={average(s.results.map((r) => percent(r.marksObtained, r.totalMarks)))} />
                        <Badge tone={submissionTone[s.status]}>{SUBMISSION_LABELS[s.status]}</Badge>
                      </span>
                      <RowChevron />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Ulasan Guru Terkini"
            actions={<ButtonLink href="/admin/ulasan" variant="ghost" size="sm" arrow>Tulis ulasan</ButtonLink>}
          />
          {comments.length === 0 ? (
            <EmptyState title="Belum ada ulasan" />
          ) : (
            <ul className="divide-y divide-line">
              {comments.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/admin/ulasan?murid=${c.student.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-beige-50 active:bg-beige-100"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-ink">{c.student.fullName}</p>
                        <span className="shrink-0 text-xs text-muted">{formatDate(c.commentDate)}</span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-sage-700">{COMMENT_LABELS[c.category]}</p>
                      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{c.content}</p>
                    </div>
                    <RowChevron />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
