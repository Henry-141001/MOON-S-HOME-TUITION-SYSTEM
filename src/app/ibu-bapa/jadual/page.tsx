import { Clock } from "lucide-react";
import { formatLongDate } from "@/lib/dates";
import { classScheduleForStudent, formatTime12 } from "@/lib/schedule";
import { Card, CardBody, CardHeader, EmptyState, PageHeader, cn } from "@/components/ui";
import { SessionStatusBadge, SubjectChip, SubjectChips, subjectBarClass } from "@/components/schedule";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Jadual Kelas" };

export default async function ParentSchedulePage({ searchParams }: PageProps<"/ibu-bapa/jadual">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const rows = await classScheduleForStudent(child.subjects.map((s) => s.subject.id));

  return (
    <>
      <PageHeader title="Jadual Kelas" description={`Kelas ${child.fullName} untuk 6 minggu akan datang.`} />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted">
        <span>Warna subjek:</span>
        <SubjectChip name="Bahasa Inggeris" />
        <SubjectChip name="Bahasa Melayu" />
        <SubjectChip name="Matematik" />
      </div>

      <Card>
        <CardHeader title="Kelas Akan Datang" description="Notifikasi dihantar secara automatik jika kelas dibatalkan, cuti, atau ada kelas ganti atau kelas tambahan." />
        {rows.length === 0 ? (
          <EmptyState title="Belum ada kelas dijadualkan" description="Jadual akan dipaparkan di sini sebaik sahaja guru menetapkannya." />
        ) : (
          <CardBody>
            <ul className="space-y-3">
              {rows.map((r) => {
                const off = r.status === "CANCELLED" || r.status === "HOLIDAY";
                return (
                  <li
                    key={r.id}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border bg-surface py-3.5 pl-5 pr-4",
                      r.isNext ? "border-navy-300 shadow-[var(--shadow-soft)]" : "border-line",
                      off && "bg-beige-50/70",
                    )}
                  >
                    <span className={cn("absolute inset-y-0 left-0 w-1.5", off ? "bg-beige-300" : subjectBarClass(r.subjects))} aria-hidden />
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn("font-semibold text-ink", off && "text-ink-soft line-through decoration-1")}>
                          {r.when ? `${r.when}, ` : ""}
                          {formatLongDate(r.date)}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-soft">
                          <Clock className="size-3.5" aria-hidden />
                          {formatTime12(r.startTime)} – {formatTime12(r.endTime)}
                        </p>
                      </div>
                      <SessionStatusBadge status={r.status} isNext={r.isNext} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <SubjectChips names={r.subjects} />
                      <span className="text-sm text-muted">{r.title}</span>
                    </div>
                    {r.notes && <p className="mt-1.5 text-sm text-ink-soft">Nota: {r.notes}</p>}
                  </li>
                );
              })}
            </ul>
          </CardBody>
        )}
      </Card>
    </>
  );
}
