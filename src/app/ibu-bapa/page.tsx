import Link from "next/link";
import { Bell, BellRing, CalendarCheck, CalendarX, Clock, Percent, Send, Trophy } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStudentRecords } from "@/lib/records";
import { formatDate, formatLongDate } from "@/lib/dates";
import { formatTime12, upcomingClassesForStudent } from "@/lib/schedule";
import { PhotoUploader } from "@/components/photo-uploader";
import { removeChildPhoto, uploadChildPhoto } from "./_actions";
import { SUBMISSION_LABELS, gradeFor } from "@/lib/constants";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  PageHeader,
  PercentPill,
  StatCard,
  submissionTone,
} from "@/components/ui";
import { InfoGrid, LatestCommentsByCategory, StudentAvatar, SubjectChips } from "@/components/records";
import { getParentView, NoChildLinked, withChild } from "./_view";

export const metadata = { title: "Maklumat Murid" };

export default async function ParentHome({ searchParams }: PageProps<"/ibu-bapa">) {
  const { parent, child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const [r, classes, notices] = await Promise.all([
    getStudentRecords(child.id, { audience: "parent" }),
    upcomingClassesForStudent(child.subjects.map((s) => s.subject.id)),
    prisma.notification.findMany({
      where: { parentId: parent.id, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, title: true, body: true },
    }),
  ]);
  const latestSchool = r.school[0];
  const [nextClass, ...laterClasses] = classes;

  return (
    <>
      <PageHeader title={`Selamat datang, ${parent.name}`} description="Ringkasan perkembangan anak anda di Moons HomeTuition." />

      {/* New notices (e.g. a class was cancelled) */}
      {notices.length > 0 && (
        <section aria-label="Notifikasi baharu" className="mb-6 rounded-[var(--radius-card)] border border-gold-300 bg-gold-100/60 p-4">
          <ul className="space-y-2.5">
            {notices.map((n) => (
              <li key={n.id} className="flex items-start gap-3">
                <Bell className="mt-0.5 size-5 shrink-0 text-gold-600" aria-hidden />
                <p className="text-sm leading-relaxed text-ink">
                  <strong>{n.title}.</strong> {n.body}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href={withChild("/ibu-bapa/notifikasi", child.id)}
            className="mt-3 inline-block text-sm font-medium text-navy-700 underline underline-offset-2"
          >
            Lihat semua notifikasi
          </Link>
        </section>
      )}

      {/* Next class reminder */}
      {nextClass && (
        <section
          aria-label="Kelas seterusnya"
          className="mb-6 overflow-hidden rounded-[var(--radius-card)] border border-navy-200 bg-navy-600 text-white shadow-[var(--shadow-soft)]"
        >
          <div className="flex items-start gap-4 p-5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15">
              <BellRing className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-white/75">
                {nextClass.ongoing ? "Kelas sedang berlangsung" : nextClass.replacement ? "Peringatan · Kelas ganti" : "Peringatan · Kelas seterusnya"}
              </p>
              <p className="mt-1 font-display text-xl font-semibold leading-snug">
                {nextClass.when ? `${nextClass.when}, ` : ""}
                {formatLongDate(nextClass.date)}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[15px] text-white/90">
                <Clock className="size-4" />
                {formatTime12(nextClass.startTime)} – {formatTime12(nextClass.endTime)}
              </p>
              <p className="mt-2 text-sm text-white/90">
                {nextClass.title}
                {nextClass.subject ? ` · ${nextClass.subject}` : ""}
              </p>
              {nextClass.notes && <p className="mt-1 text-sm text-white/75">Nota: {nextClass.notes}</p>}
            </div>
          </div>
          {laterClasses.length > 0 && (
            <ul className="divide-y divide-white/10 border-t border-white/15 bg-navy-700/40">
              {laterClasses.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 px-5 py-2.5 text-sm">
                  <span className="font-medium">
                    {c.when ? `${c.when} · ` : ""}
                    {formatDate(c.date)}
                  </span>
                  <span className="text-white/80">
                    {formatTime12(c.startTime)} · {c.subject ?? c.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href={withChild("/ibu-bapa/jadual", child.id)}
            className="flex items-center justify-between border-t border-white/15 px-5 py-3 text-sm font-medium text-white hover:bg-white/5"
          >
            Lihat Jadual Kelas penuh <span aria-hidden>→</span>
          </Link>
        </section>
      )}

      {/* A. Child profile */}
      <Card>
        <CardBody className="flex flex-col gap-5 py-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-start gap-3">
            <StudentAvatar studentId={child.id} name={child.fullName} photoVersion={child.photo?.updatedAt} size={96} />
            <PhotoUploader
              upload={uploadChildPhoto.bind(null, child.id)}
              remove={removeChildPhoto.bind(null, child.id)}
              hasPhoto={Boolean(child.photo)}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-semibold text-ink">
                {child.fullName} {child.isDemo && <DemoBadge />}
              </h2>
              <p className="text-sm text-muted">ID Murid: {child.studentCode}</p>
            </div>
            <InfoGrid
              items={[
                { label: "Sekolah", value: child.school },
                { label: "Tahun / Tingkatan", value: child.yearForm },
                { label: "Tarikh Daftar", value: formatDate(child.registrationDate) },
              ]}
            />
            <div>
              <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Subjek Didaftarkan</p>
              <SubjectChips subjects={child.subjects.map((s) => s.subject.name)} />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* C. Attendance */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Kelas Dihadiri" value={r.attendanceSummary.present} icon={<CalendarCheck className="size-5" />} />
        <StatCard label="Tidak Hadir" value={r.attendanceSummary.absent} icon={<CalendarX className="size-5" />} tone="rose" />
        <StatCard
          label="Peratus Kehadiran"
          value={r.attendanceSummary.percent === null ? "—" : `${r.attendanceSummary.percent}%`}
          icon={<Percent className="size-5" />}
          tone="sky"
        />
        <StatCard
          label="Purata Ujian Tuisyen"
          value={r.tuitionOverall === null ? "—" : `${r.tuitionOverall}%`}
          icon={<Trophy className="size-5" />}
          tone="amber"
        />
      </div>

      {/* B. Academic */}
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Keputusan Ujian Tuisyen Terkini"
            actions={<ButtonLink href={withChild("/ibu-bapa/tuisyen", child.id)} variant="ghost" size="sm" arrow>Lihat semua</ButtonLink>}
          />
          {r.tuition.length === 0 ? (
            <EmptyState title="Belum ada markah ujian tuisyen" />
          ) : (
            <ul className="divide-y divide-line">
              {r.tuition.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {t.subject} · {t.examName}
                    </p>
                    <p className="text-xs text-muted">{formatDate(t.date)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <PercentPill value={t.percent} />
                    <span className="font-semibold text-ink-soft">Gred {gradeFor(t.percent).grade}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Keputusan Peperiksaan Sekolah Terkini"
            actions={<ButtonLink href={withChild("/ibu-bapa/sekolah", child.id)} variant="ghost" size="sm" arrow>Lihat semua</ButtonLink>}
          />
          {!latestSchool ? (
            <EmptyState
              title="Belum ada keputusan sekolah"
              description="Hantar keputusan peperiksaan sekolah anak anda supaya guru boleh memantau prestasinya."
              action={
                <ButtonLink href={withChild("/ibu-bapa/sekolah", child.id)} variant="soft" size="sm">
                  <Send className="size-4" /> Hantar keputusan
                </ButtonLink>
              }
            />
          ) : (
            <CardBody>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{latestSchool.title}</p>
                  <p className="text-xs text-muted">{formatDate(latestSchool.date)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PercentPill value={latestSchool.overall} />
                  <Badge tone={submissionTone[latestSchool.status]}>{SUBMISSION_LABELS[latestSchool.status]}</Badge>
                </div>
              </div>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {latestSchool.results.map((x) => (
                  <li key={x.id} className="flex items-center justify-between rounded-xl bg-beige-50 px-3 py-2 text-sm">
                    <span className="text-ink-soft">{x.subject}</span>
                    <span className="font-medium">
                      {x.percent}% · Gred {gradeFor(x.percent).grade}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          )}
        </Card>
      </div>

      {/* D. Teacher feedback */}
      <Card className="mt-6">
        <CardHeader
          title="Maklum Balas Guru Terkini"
          actions={<ButtonLink href={withChild("/ibu-bapa/ulasan", child.id)} variant="ghost" size="sm" arrow>Semua ulasan</ButtonLink>}
        />
        <CardBody>
          <LatestCommentsByCategory comments={r.comments} categories={["ACADEMIC", "STRENGTHS", "IMPROVEMENT", "RECOMMENDATIONS"]} />
        </CardBody>
      </Card>

      {/* E. Submit */}
      <Link
        href={withChild("/ibu-bapa/sekolah", child.id)}
        className="mt-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-navy-200 bg-navy-50 px-5 py-4 hover:bg-navy-100"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-navy-600 text-white">
          <Send className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block font-medium text-ink">Hantar Keputusan Peperiksaan Sekolah</span>
          <span className="text-sm text-ink-soft">Masukkan markah ujian atau peperiksaan sekolah anak anda.</span>
        </span>
        <span className="text-navy-700">→</span>
      </Link>
    </>
  );
}
