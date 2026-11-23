// Class timetable pieces shared by the admin and parent pages.
import { Ban, CalendarClock, Palmtree, RefreshCw } from "lucide-react";
import { cn } from "@/components/ui";
import { subjectColor } from "@/lib/subject-colors";
import type { SessionStatusValue } from "@/lib/constants";

/** Subject name in its timetable colour (BI blue, BM red, Matematik green). */
export function SubjectChip({ name }: { name: string | null }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", subjectColor(name).chip)}>
      {name ?? "Semua murid"}
    </span>
  );
}

export function SubjectChips({ names }: { names: string[] }) {
  if (names.length === 0) return <SubjectChip name={null} />;
  return (
    <span className="flex flex-wrap gap-1">
      {names.map((n) => (
        <SubjectChip key={n} name={n} />
      ))}
    </span>
  );
}

const STATUS_STYLE: Record<SessionStatusValue | "NEXT", { label: string; className: string; Icon: typeof Ban }> = {
  NEXT: { label: "Kelas Seterusnya", className: "bg-navy-600 text-white ring-navy-600", Icon: CalendarClock },
  SCHEDULED: { label: "Dijadualkan", className: "bg-navy-50 text-navy-700 ring-navy-200", Icon: CalendarClock },
  REPLACEMENT: { label: "Kelas Ganti", className: "bg-amber-soft text-amber-ink ring-amber-soft", Icon: RefreshCw },
  HOLIDAY: { label: "Cuti", className: "bg-sky-soft text-sky-ink ring-sky-soft", Icon: Palmtree },
  CANCELLED: { label: "Dibatalkan", className: "bg-rose-soft text-rose-ink ring-rose-soft", Icon: Ban },
};

/** Status pill. A scheduled class that is the very next one shows "Kelas Seterusnya". */
export function SessionStatusBadge({ status, isNext = false }: { status: SessionStatusValue; isNext?: boolean }) {
  const key = isNext && status === "SCHEDULED" ? "NEXT" : status;
  const { label, className, Icon } = STATUS_STYLE[key];
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", className)}>
      <Icon className="size-3.5" aria-hidden />
      {isNext && status === "REPLACEMENT" ? "Kelas Seterusnya · Ganti" : label}
    </span>
  );
}

/** Coloured strip on the left of a timetable card (first subject's colour). */
export function subjectBarClass(names: string[]) {
  return subjectColor(names[0] ?? null).bar;
}
