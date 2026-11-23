// Shared, server-rendered views of a student's records (admin profile + parent portal).
import Image from "next/image";
import type { ReactNode } from "react";
import { CalendarCheck, CalendarX, CircleSlash, ClipboardCheck, Percent } from "lucide-react";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PercentPill,
  StatCard,
  Table,
  TrendText,
  attendanceTone,
  cn,
  submissionTone,
  td,
  th,
} from "@/components/ui";
import { PercentBarChart, TrendLineChart } from "@/components/charts";
import { ATTENDANCE_LABELS, COMMENT_CATEGORIES, COMMENT_LABELS, SUBMISSION_LABELS, gradeFor } from "@/lib/constants";
import { formatDate, formatDateTime, formatMonth, formatShortDate } from "@/lib/dates";
import { timelineBySubject, type SubjectPerformance } from "@/lib/analytics";
import type { StudentRecords } from "@/lib/records";

// ───────── Student identity ─────────

export function StudentAvatar({
  studentId,
  name,
  photoVersion,
  size = 56,
}: {
  studentId: string;
  name: string;
  photoVersion?: Date | null;
  size?: number;
}) {
  if (photoVersion) {
    return (
      <Image
        src={`/api/foto/${studentId}?v=${photoVersion.getTime()}`}
        alt={`Gambar ${name}`}
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-2xl object-cover ring-1 ring-line"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return (
    <span
      className="grid shrink-0 place-items-center rounded-2xl bg-navy-100 font-semibold text-navy-700"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export function InfoGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">{it.label}</dt>
          <dd className="mt-1 text-sm text-ink">{it.value || <span className="text-muted">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SubjectChips({ subjects }: { subjects: string[] }) {
  if (subjects.length === 0) return <span className="text-sm text-muted">Tiada subjek didaftarkan</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {subjects.map((s) => (
        <Badge key={s} tone="beige">
          {s}
        </Badge>
      ))}
    </div>
  );
}

// ───────── Attendance ─────────

export function AttendanceStats({ summary }: { summary: StudentRecords["attendanceSummary"] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Kelas Dihadiri" value={summary.present} icon={<CalendarCheck className="size-5" />} />
      <StatCard label="Tidak Hadir" value={summary.absent} icon={<CalendarX className="size-5" />} tone="rose" />
      <StatCard label="Tidak Hadir Bersebab" value={summary.excused} icon={<CircleSlash className="size-5" />} tone="amber" />
      <StatCard
        label="Peratus Kehadiran"
        value={summary.percent === null ? "—" : `${summary.percent}%`}
        icon={<Percent className="size-5" />}
        tone="sky"
        hint="Ketidakhadiran bersebab tidak dikira"
      />
    </div>
  );
}

export function MonthlyAttendanceTable({ months }: { months: StudentRecords["attendanceMonthly"] }) {
  if (months.length === 0) return <EmptyState title="Belum ada rekod kehadiran" />;
  return (
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
            <td className={cn(td, "font-medium")}>{formatMonth(m.month)}</td>
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
  );
}

export function AttendanceHistoryTable({ rows, limit }: { rows: StudentRecords["attendance"]; limit?: number }) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (list.length === 0) return <EmptyState title="Belum ada rekod kehadiran" />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Tarikh</th>
          <th className={th}>Status</th>
          <th className={th}>Catatan</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => (
          <tr key={r.id}>
            <td className={td}>{formatDate(r.date)}</td>
            <td className={td}>
              <Badge tone={attendanceTone[r.status]}>{ATTENDANCE_LABELS[r.status]}</Badge>
            </td>
            <td className={cn(td, "text-ink-soft")}>{r.note || "—"}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

// ───────── Results ─────────

export function TuitionResultsTable({ rows, limit }: { rows: StudentRecords["tuition"]; limit?: number }) {
  const list = limit ? rows.slice(0, limit) : rows;
  if (list.length === 0) return <EmptyState title="Belum ada markah ujian tuisyen" />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Tarikh</th>
          <th className={th}>Ujian</th>
          <th className={th}>Subjek</th>
          <th className={th}>Peratus</th>
          <th className={th}>Gred</th>
          <th className={th}>Catatan</th>
        </tr>
      </thead>
      <tbody>
        {list.map((r) => (
          <tr key={r.id}>
            <td className={cn(td, "whitespace-nowrap")}>{formatDate(r.date)}</td>
            <td className={cn(td, "font-medium")}>{r.examName}</td>
            <td className={td}>{r.subject}</td>
            <td className={td}>
              <PercentPill value={r.percent} />
            </td>
            <td className={cn(td, "font-semibold")}>{gradeFor(r.percent).grade}</td>
            <td className={cn(td, "text-ink-soft")}>
              {r.remarks || (r.teacherComments.length === 0 ? "—" : null)}
              {r.teacherComments.map((tc) => (
                <span key={tc.id} className="mt-1 block max-w-80 rounded-lg bg-gold-100/50 px-2 py-1 text-xs text-ink first:mt-0">
                  <span className="font-semibold text-gold-600">Ulasan guru{tc.isPublished ? "" : " (draf)"}: </span>
                  <span className="line-clamp-3">{tc.content}</span>
                </span>
              ))}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function SchoolExamCard({
  exam,
  actions,
  showSubmittedAt = false,
}: {
  exam: StudentRecords["school"][number];
  actions?: ReactNode;
  showSubmittedAt?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{exam.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            Tarikh peperiksaan: {formatDate(exam.date)}
            {showSubmittedAt && <> · Dihantar {formatDate(exam.createdAt.toISOString())}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PercentPill value={exam.overall} />
          <Badge tone={submissionTone[exam.status]}>{SUBMISSION_LABELS[exam.status]}</Badge>
        </div>
      </div>
      {exam.status === "NEEDS_CORRECTION" && exam.adminNote && (
        <div className="mx-4 mb-3 rounded-xl bg-rose-soft px-3 py-2 text-[13px] text-rose-ink">
          <span className="font-medium">Catatan guru:</span> {exam.adminNote}
        </div>
      )}
      <ul className="grid gap-x-6 border-t border-line px-4 py-2 sm:grid-cols-2">
        {exam.results.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-b-0 sm:[&:nth-last-child(2):nth-child(odd)]:border-b-0">
            <span className="min-w-0 truncate text-sm text-ink">{r.subject}</span>
            <span className="flex shrink-0 items-center gap-2">
              <PercentPill value={r.percent} />
              <span className="w-12 text-right text-sm font-semibold text-ink-soft">Gred {gradeFor(r.percent).grade}</span>
            </span>
          </li>
        ))}
      </ul>
      {(exam.remarks || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <p className="text-[13px] text-ink-soft">{exam.remarks ? <>Catatan: {exam.remarks}</> : null}</p>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}

export function SubjectPerformanceTable({ rows, emptyText }: { rows: SubjectPerformance[]; emptyText: string }) {
  if (rows.length === 0) return <EmptyState title={emptyText} />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Subjek</th>
          <th className={th}>Bil.</th>
          <th className={th}>Purata</th>
          <th className={th}>Terkini</th>
          <th className={th}>Sebelum</th>
          <th className={th}>Perubahan</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.subject}>
            <td className={cn(td, "font-medium")}>{r.subject}</td>
            <td className={td}>{r.count}</td>
            <td className={td}>
              <PercentPill value={r.average} />
            </td>
            <td className={td}>
              <PercentPill value={r.latest} />
              <span className="ml-1.5 text-xs text-muted">{formatShortDate(r.latestDate)}</span>
            </td>
            <td className={td}>{r.previous === null ? <span className="text-muted">—</span> : `${r.previous.toFixed(1)}%`}</td>
            <td className={td}>
              <TrendText change={r.change} />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/**
 * Full academic performance analysis. School and tuition results are always
 * shown in separate, clearly labelled sections — never combined.
 */
export function PerformanceAnalysis({ records }: { records: StudentRecords }) {
  const tuitionTimeline = timelineBySubject(records.tuitionScoreRows, formatShortDate);
  const schoolTimeline = timelineBySubject(records.schoolScoreRows, formatShortDate);

  const subjects = [...new Set([...records.tuitionBySubject, ...records.schoolBySubject].map((s) => s.subject))].sort();
  const compare = subjects.map((name) => ({
    name,
    tuition: records.tuitionBySubject.find((s) => s.subject === name)?.average ?? null,
    school: records.schoolBySubject.find((s) => s.subject === name)?.average ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <OverallBox
          title="Purata Keseluruhan — Ujian Tuisyen"
          value={records.tuitionOverall}
          count={records.tuition.length}
          unit="ujian"
          tone="navy"
        />
        <OverallBox
          title="Purata Keseluruhan — Peperiksaan Sekolah"
          value={records.schoolOverall}
          count={records.school.filter((e) => e.status !== "NEEDS_CORRECTION").length}
          unit="peperiksaan"
          tone="beige"
        />
      </div>

      <Card>
        <CardHeader
          title="Perbandingan Purata Mengikut Subjek"
          description="Bar biru = ujian tuisyen, bar emas = peperiksaan sekolah. Kedua-duanya dikira berasingan."
        />
        <CardBody>
          <PercentBarChart
            data={compare}
            bars={[
              { key: "tuition", label: "Ujian Tuisyen" },
              { key: "school", label: "Peperiksaan Sekolah" },
            ]}
          />
        </CardBody>
      </Card>

      <SectionTitle tone="navy" title="A. Ujian Tuisyen" subtitle="Markah dimasukkan oleh guru tuisyen" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perkembangan Ujian Tuisyen" description="Peratus markah mengikut tarikh ujian" />
          <CardBody>
            <TrendLineChart points={tuitionTimeline.points} series={tuitionTimeline.subjects} emptyText="Belum ada markah ujian tuisyen." />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Prestasi Mengikut Subjek (Tuisyen)" />
          <SubjectPerformanceTable rows={records.tuitionBySubject} emptyText="Belum ada markah ujian tuisyen" />
        </Card>
      </div>

      <SectionTitle tone="gold" title="B. Peperiksaan Sekolah" subtitle="Keputusan dihantar oleh ibu bapa" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perkembangan Peperiksaan Sekolah" description="Peratus markah mengikut peperiksaan" />
          <CardBody>
            <TrendLineChart points={schoolTimeline.points} series={schoolTimeline.subjects} emptyText="Belum ada keputusan peperiksaan sekolah." />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Prestasi Mengikut Subjek (Sekolah)" />
          <SubjectPerformanceTable rows={records.schoolBySubject} emptyText="Belum ada keputusan peperiksaan sekolah" />
        </Card>
      </div>
      <p className="text-xs text-muted">
        Keputusan sekolah yang ditanda &ldquo;Perlu Pembetulan&rdquo; tidak dikira dalam analisis sehingga dibetulkan.
      </p>
    </div>
  );
}

function OverallBox({
  title,
  value,
  count,
  unit,
  tone,
}: {
  title: string;
  value: number | null;
  count: number;
  unit: string;
  tone: "navy" | "beige";
}) {
  const g = value === null ? null : gradeFor(value);
  return (
    <div className={cn("rounded-[var(--radius-card)] border p-5", tone === "navy" ? "border-navy-200 bg-navy-50" : "border-gold-300 bg-gold-100")}>
      <p className="text-[13px] font-medium text-ink-soft">{title}</p>
      <div className="mt-2 flex items-end gap-3">
        <p className="text-3xl font-semibold tracking-tight text-ink">{value === null ? "—" : `${value.toFixed(1)}%`}</p>
        {g && <span className="mb-1 rounded-lg bg-surface px-2 py-0.5 text-sm font-semibold text-ink-soft">Gred {g.grade}</span>}
      </div>
      <p className="mt-1 text-xs text-muted">
        Berdasarkan {count} {unit}
      </p>
    </div>
  );
}

export function SectionTitle({ title, subtitle, tone }: { title: string; subtitle?: string; tone: "navy" | "gold" }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className={cn("h-6 w-1.5 rounded-full", tone === "navy" ? "bg-navy-600" : "bg-gold-400")} />
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}

// ───────── Comments ─────────

type CommentItem = StudentRecords["comments"][number];
type ReplyItem = CommentItem["replies"][number];

/**
 * Teacher comments as cards. A "Keputusan Ujian" comment shows the test and its mark.
 * Under each comment is the conversation between the teacher and the parents.
 * `viewer` decides which unread messages are highlighted as new.
 */
export function CommentsList({
  comments,
  renderActions,
  renderReplyForm,
  renderReplyActions,
  viewer = "admin",
  limit,
}: {
  comments: CommentItem[];
  renderActions?: (comment: CommentItem) => ReactNode;
  renderReplyForm?: (comment: CommentItem) => ReactNode;
  renderReplyActions?: (comment: CommentItem, reply: ReplyItem) => ReactNode;
  viewer?: "admin" | "parent";
  limit?: number;
}) {
  const list = limit ? comments.slice(0, limit) : comments;
  if (list.length === 0) return <EmptyState title="Belum ada ulasan guru" />;
  return (
    <ol className="space-y-3">
      {list.map((c) => (
        <li key={c.id} id={`ulasan-${c.id}`} className="scroll-mt-24 rounded-2xl border border-line bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={categoryTone(c.category)}>{COMMENT_LABELS[c.category]}</Badge>
              {!c.isPublished && <Badge tone="neutral">Draf — tidak dipaparkan</Badge>}
            </div>
            <time className="text-xs text-muted">{formatDate(c.commentDate)}</time>
          </div>
          {c.exam && <ExamChip exam={c.exam} />}
          <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-ink">{c.content}</p>
          {c.photoUrl && (
            <a href={c.photoUrl} target="_blank" rel="noopener" className="mt-3 block w-fit max-w-full overflow-hidden rounded-xl ring-1 ring-line">
              <Image
                src={c.photoUrl}
                alt={`Gambar ulasan ${COMMENT_LABELS[c.category]}`}
                width={480}
                height={360}
                unoptimized
                loading="lazy"
                className="h-auto max-h-80 w-auto max-w-full object-contain"
              />
            </a>
          )}

          {c.replies.length > 0 && (
            <ul className="mt-3 space-y-2 border-t border-line pt-3" aria-label="Perbualan">
              {c.replies.map((r) => {
                const isNew = r.unread && (viewer === "admin" ? r.fromParent : !r.fromParent);
                return (
                  <li key={r.id} className={cn("flex", r.fromParent ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5",
                        r.fromParent ? "rounded-br-md bg-navy-50" : "rounded-bl-md bg-beige-100",
                        isNew && "ring-2 ring-gold-300",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-semibold text-ink">{r.fromParent ? r.authorName : `${r.authorName} (Guru)`}</span>
                        <time className="text-muted">{formatDateTime(new Date(r.createdAt))}</time>
                        {isNew && <Badge tone="gold">Baharu</Badge>}
                      </div>
                      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink">{r.content}</p>
                      {renderReplyActions && <div className="mt-1 flex justify-end">{renderReplyActions(c, r)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {(renderReplyForm || renderActions) && (
            <div className="mt-3 flex flex-wrap items-start justify-end gap-2">
              {renderReplyForm?.(c)}
              {renderActions?.(c)}
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** The tuition test a "Keputusan Ujian" comment is about, with the student's mark. */
function ExamChip({ exam }: { exam: NonNullable<CommentItem["exam"]> }) {
  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-gold-300/60 bg-gold-100/40 px-3 py-2">
      <ClipboardCheck className="size-4 shrink-0 text-gold-600" aria-hidden />
      <span className="min-w-[11rem] flex-1">
        <span className="block text-sm font-medium text-ink">{exam.name}</span>
        <span className="block text-xs text-muted">
          {exam.subject} · {formatDate(exam.date)}
        </span>
      </span>
      <span className="flex items-center gap-1.5 text-xs text-muted">
        Markah <PercentPill value={exam.percent} />
        {exam.percent !== null && <span className="font-semibold text-ink">{gradeFor(exam.percent).grade}</span>}
      </span>
    </div>
  );
}

/** Latest comment per category, as cards (parent overview and reports). */
export function LatestCommentsByCategory({
  comments,
  categories = COMMENT_CATEGORIES,
}: {
  comments: StudentRecords["comments"];
  categories?: readonly StudentRecords["comments"][number]["category"][];
}) {
  const latest = categories
    .map((cat) => comments.find((c) => c.category === cat))
    .filter((c): c is StudentRecords["comments"][number] => Boolean(c));
  if (latest.length === 0) return <EmptyState title="Belum ada ulasan guru" />;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {latest.map((c) => (
        <div key={c.id} className="rounded-2xl border border-line bg-beige-50/50 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-semibold text-navy-700">{COMMENT_LABELS[c.category]}</p>
            <time className="text-xs text-muted">{formatDate(c.commentDate)}</time>
          </div>
          {c.exam && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              {c.exam.name} · {c.exam.subject} <PercentPill value={c.exam.percent} />
            </p>
          )}
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink">{c.content}</p>
          {c.replies.length > 0 && <p className="mt-2 text-xs text-navy-700">{c.replies.length} balasan dalam perbualan</p>}
        </div>
      ))}
    </div>
  );
}

function categoryTone(category: string) {
  switch (category) {
    case "STRENGTHS":
      return "success" as const;
    case "IMPROVEMENT":
      return "amber" as const;
    case "RECOMMENDATIONS":
      return "sky" as const;
    case "ATTITUDE":
      return "rose" as const;
    case "EXAM_RESULT":
      return "gold" as const;
    default:
      return "beige" as const;
  }
}
