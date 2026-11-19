import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireAdminView } from "@/lib/session";
import { buildStudentReport } from "@/lib/report";
import { formatDate, formatLongDate, formatMonth, todayISO } from "@/lib/dates";
import { COMMENT_LABELS, gradeFor } from "@/lib/constants";
import { ButtonLink, MoonMark, PercentPill, Table, TrendText, buttonClass, cn, td, th } from "@/components/ui";
import { StudentAvatar } from "@/components/records";
import { PercentBarChart } from "@/components/charts";
import { PrintButton } from "./print-button";

export const metadata = { title: "Laporan Prestasi" };

export default async function StudentReportPage({ params }: PageProps<"/admin/laporan/[id]">) {
  await requireAdminView();
  const { id } = await params;
  const r = await buildStudentReport(id);
  if (!r) notFound();

  const subjects = [...new Set([...r.tuitionBySubject, ...r.schoolBySubject].map((s) => s.subject))].sort();
  const compare = subjects.map((name) => ({
    name,
    tuition: r.tuitionBySubject.find((s) => s.subject === name)?.average ?? null,
    school: r.schoolBySubject.find((s) => s.subject === name)?.average ?? null,
  }));

  return (
    <>
      <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href="/admin/laporan" variant="secondary">
          Kembali
        </ButtonLink>
        <div className="flex gap-2">
          <PrintButton />
          <a href={`/api/laporan/${r.student.id}`} className={buttonClass("primary")}>
            <Download className="size-4" /> Muat Turun PDF
          </a>
        </div>
      </div>

      <article className="print-full mx-auto max-w-4xl rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-10">
        {/* Letterhead */}
        <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-sage-600 pb-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-sage-600 text-beige-50">
              <MoonMark className="size-7" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold tracking-wide text-ink">{r.centre.name.toUpperCase()}</p>
              <p className="text-xs text-muted">{[r.centre.address, r.centre.phone].filter(Boolean).join(" · ") || "Pusat Tuisyen Rumah"}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-semibold text-sage-700">Laporan Prestasi Murid</p>
            <p className="text-xs text-muted">Dijana pada {formatLongDate(todayISO())}</p>
          </div>
        </header>

        {/* Student */}
        <section className="print-break-avoid mt-6 flex flex-wrap items-start gap-5">
          <StudentAvatar studentId={r.student.id} name={r.student.name} photoVersion={r.student.photoVersion} size={84} />
          <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2.5 text-sm sm:grid-cols-3">
            <Info label="Nama Murid" value={r.student.name} />
            <Info label="ID Murid" value={r.student.code} />
            <Info label="Tahun / Tingkatan" value={r.student.yearForm} />
            <Info label="Sekolah" value={r.student.school} />
            <Info label="Ibu Bapa / Penjaga" value={r.student.guardian} />
            <Info label="Tarikh Daftar" value={formatDate(r.student.registrationDate)} />
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">Subjek Didaftarkan</dt>
              <dd className="mt-0.5">{r.student.subjects.join(", ") || "—"}</dd>
            </div>
          </dl>
        </section>

        {/* Summary boxes */}
        <section className="print-break-avoid mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Summary label="Kehadiran" value={r.attendance.percent === null ? "—" : `${r.attendance.percent}%`} sub={`${r.attendance.present} hadir · ${r.attendance.absent} tidak hadir`} />
          <Summary label="Bersebab" value={String(r.attendance.excused)} sub="ketidakhadiran bersebab" />
          <Summary
            label="Purata Tuisyen"
            value={r.tuitionOverall === null ? "—" : `${r.tuitionOverall}%`}
            sub={r.tuitionOverall === null ? "tiada ujian" : `Gred ${gradeFor(r.tuitionOverall).grade} · ${r.tuitionCount} ujian`}
          />
          <Summary
            label="Purata Sekolah"
            value={r.schoolOverall === null ? "—" : `${r.schoolOverall}%`}
            sub={r.schoolOverall === null ? "tiada keputusan disahkan" : `Gred ${gradeFor(r.schoolOverall).grade} · ${r.school.length} peperiksaan`}
          />
        </section>

        {/* Analysis */}
        <ReportSection title="1. Analisis Prestasi Akademik">
          <div className="print-break-avoid">
            <PercentBarChart
              data={compare}
              bars={[
                { key: "tuition", label: "Ujian Tuisyen" },
                { key: "school", label: "Peperiksaan Sekolah" },
              ]}
              height={230}
              emptyText="Belum ada markah untuk dianalisis."
              animate={false}
            />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <PerfTable title="Ujian Tuisyen" rows={r.tuitionBySubject} />
            <PerfTable title="Peperiksaan Sekolah" rows={r.schoolBySubject} />
          </div>
        </ReportSection>

        <ReportSection title="2. Keputusan Ujian Tuisyen">
          {r.tuition.length === 0 ? (
            <Empty>Belum ada markah ujian tuisyen.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Tarikh</th>
                  <th className={th}>Ujian</th>
                  <th className={th}>Subjek</th>
                  <th className={th}>Markah</th>
                  <th className={th}>%</th>
                  <th className={th}>Gred</th>
                </tr>
              </thead>
              <tbody>
                {r.tuition.map((t) => (
                  <tr key={t.id}>
                    <td className={cn(td, "whitespace-nowrap py-2")}>{formatDate(t.date)}</td>
                    <td className={cn(td, "py-2")}>{t.examName}</td>
                    <td className={cn(td, "py-2")}>{t.subject}</td>
                    <td className={cn(td, "py-2")}>
                      {t.marks}/{t.total}
                    </td>
                    <td className={cn(td, "py-2")}>{t.percent.toFixed(1)}</td>
                    <td className={cn(td, "py-2 font-semibold")}>{gradeFor(t.percent).grade}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
          {r.tuitionCount > r.tuition.length && <p className="mt-2 text-xs text-muted">Menunjukkan {r.tuition.length} ujian terkini daripada {r.tuitionCount}.</p>}
        </ReportSection>

        <ReportSection title="3. Keputusan Peperiksaan Sekolah">
          {r.school.length === 0 ? (
            <Empty>Belum ada keputusan peperiksaan sekolah yang disahkan.</Empty>
          ) : (
            <div className="space-y-3">
              {r.school.map((e) => (
                <div key={e.id} className="print-break-avoid rounded-xl border border-line">
                  <div className="flex items-center justify-between gap-3 bg-beige-50 px-4 py-2">
                    <p className="text-sm font-medium">
                      {e.title} <span className="font-normal text-muted">· {formatDate(e.date)}</span>
                    </p>
                    <PercentPill value={e.overall} />
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 px-4 py-2.5 text-sm sm:grid-cols-3">
                    {e.results.map((x) => (
                      <p key={x.id} className="flex justify-between gap-2">
                        <span className="text-ink-soft">{x.subject}</span>
                        <span className="font-medium">
                          {x.marks}/{x.total} ({gradeFor(x.percent).grade})
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted">Hanya keputusan yang telah disahkan oleh guru dipaparkan.</p>
        </ReportSection>

        <ReportSection title="4. Ringkasan Kehadiran">
          {r.attendanceMonthly.length === 0 ? (
            <Empty>Belum ada rekod kehadiran.</Empty>
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
                {r.attendanceMonthly.map((m) => (
                  <tr key={m.month}>
                    <td className={cn(td, "py-2")}>{formatMonth(m.month)}</td>
                    <td className={cn(td, "py-2")}>{m.present}</td>
                    <td className={cn(td, "py-2")}>{m.absent}</td>
                    <td className={cn(td, "py-2")}>{m.excused}</td>
                    <td className={cn(td, "py-2")}>{m.percent === null ? "—" : `${m.percent}%`}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </ReportSection>

        <ReportSection title="5. Ulasan Guru">
          <div className="grid gap-3 md:grid-cols-2">
            <CommentBlock title="Kekuatan" items={r.comments.strengths} />
            <CommentBlock title="Ruang Penambahbaikan" items={r.comments.improvement} />
          </div>
          {r.comments.other.length > 0 && (
            <div className="mt-3 space-y-2">
              {r.comments.other.map((c) => (
                <div key={c.id} className="print-break-avoid rounded-xl border border-line px-4 py-3">
                  <p className="text-xs font-semibold text-sage-700">
                    {COMMENT_LABELS[c.category]} <span className="font-normal text-muted">· {formatDate(c.commentDate)}</span>
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm">{c.content}</p>
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        <ReportSection title="6. Cadangan Penambahbaikan">
          <div className="print-break-avoid rounded-xl bg-sage-50 px-5 py-4">
            {r.comments.recommendations.length === 0 && r.autoNotes.length === 0 ? (
              <p className="text-sm text-ink-soft">Teruskan usaha yang baik. Tiada cadangan khusus pada masa ini.</p>
            ) : (
              <ul className="list-disc space-y-1.5 pl-5 text-sm">
                {r.comments.recommendations.slice(0, 3).map((c) => (
                  <li key={c.id} className="whitespace-pre-line">
                    {c.content}
                  </li>
                ))}
                {r.autoNotes.map((n) => (
                  <li key={n} className="text-ink-soft">
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ReportSection>

        <footer className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-line pt-5 text-xs text-muted">
          <p className="max-w-md whitespace-pre-line">{r.centre.note || `Terima kasih atas kepercayaan anda kepada ${r.centre.name}.`}</p>
          <div className="text-center">
            <div className="mb-1 h-10 w-48 border-b border-ink-soft" />
            <p>Tandatangan Guru</p>
          </div>
        </footer>
      </article>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

function Summary({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-line bg-beige-50/60 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold text-ink">{value}</p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 border-b border-line pb-1.5 font-display text-base font-semibold text-sage-700">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-beige-50 px-4 py-3 text-sm text-muted">{children}</p>;
}

function PerfTable({ title, rows }: { title: string; rows: { subject: string; average: number; latest: number; change: number | null }[] }) {
  return (
    <div className="print-break-avoid rounded-xl border border-line">
      <p className="border-b border-line bg-beige-50 px-4 py-2 text-sm font-semibold">{title}</p>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-sm text-muted">Tiada data.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
              <th className="px-4 py-1.5 font-medium">Subjek</th>
              <th className="px-2 py-1.5 font-medium">Purata</th>
              <th className="px-2 py-1.5 font-medium">Terkini</th>
              <th className="px-2 py-1.5 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.subject} className="border-t border-line">
                <td className="px-4 py-1.5">{s.subject}</td>
                <td className="px-2 py-1.5 font-medium">{s.average.toFixed(1)}%</td>
                <td className="px-2 py-1.5">{s.latest.toFixed(1)}%</td>
                <td className="px-2 py-1.5">
                  <TrendText change={s.change} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CommentBlock({ title, items }: { title: string; items: { id: string; content: string; commentDate: string }[] }) {
  return (
    <div className="print-break-avoid rounded-xl border border-line px-4 py-3">
      <p className="text-xs font-semibold text-sage-700">{title}</p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-muted">—</p>
      ) : (
        items.slice(0, 2).map((c) => (
          <p key={c.id} className="mt-1 whitespace-pre-line text-sm">
            {c.content} <span className="text-xs text-muted">({formatDate(c.commentDate)})</span>
          </p>
        ))
      )}
    </div>
  );
}
