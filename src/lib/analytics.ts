// Pure calculation helpers (safe for server and client).

export function percent(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((obtained / total) * 1000) / 10;
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

export type AttendanceCounts = {
  present: number;
  absent: number;
  excused: number;
  total: number;
  /** Present ÷ (present + absent). Excused absences are not counted against the student. */
  percent: number | null;
};

export function attendanceCounts(records: { status: string }[]): AttendanceCounts {
  let present = 0;
  let absent = 0;
  let excused = 0;
  for (const r of records) {
    if (r.status === "PRESENT") present++;
    else if (r.status === "ABSENT") absent++;
    else if (r.status === "EXCUSED") excused++;
  }
  const counted = present + absent;
  return {
    present,
    absent,
    excused,
    total: records.length,
    percent: counted === 0 ? null : Math.round((present / counted) * 1000) / 10,
  };
}

/** Groups attendance by YYYY-MM, newest month first. */
export function monthlyAttendance(records: { date: string; status: string }[]) {
  const byMonth = new Map<string, { status: string }[]>();
  for (const r of records) {
    const key = r.date.slice(0, 7);
    if (!byMonth.has(key)) byMonth.set(key, []);
    byMonth.get(key)!.push(r);
  }
  return [...byMonth.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([month, rows]) => ({ month, ...attendanceCounts(rows) }));
}

export type ScoreRow = { subject: string; date: string; percent: number; label?: string };

export type SubjectPerformance = {
  subject: string;
  count: number;
  average: number;
  latest: number;
  latestDate: string;
  previous: number | null;
  change: number | null;
  trend: "up" | "down" | "same" | null;
};

/** Per-subject average, latest score and change versus the previous score. */
export function subjectPerformance(rows: ScoreRow[]): SubjectPerformance[] {
  const bySubject = new Map<string, ScoreRow[]>();
  for (const r of rows) {
    if (!bySubject.has(r.subject)) bySubject.set(r.subject, []);
    bySubject.get(r.subject)!.push(r);
  }
  return [...bySubject.entries()]
    .map(([subject, list]) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const change = prev ? Math.round((latest.percent - prev.percent) * 10) / 10 : null;
      return {
        subject,
        count: sorted.length,
        average: average(sorted.map((s) => s.percent)) ?? 0,
        latest: latest.percent,
        latestDate: latest.date,
        previous: prev?.percent ?? null,
        change,
        trend: change === null ? null : change > 0 ? "up" : change < 0 ? "down" : "same",
      } satisfies SubjectPerformance;
    })
    .sort((a, b) => a.subject.localeCompare(b.subject));
}

/**
 * Pivots score rows into chart points: one point per date label, one key per subject.
 * e.g. [{ label: "12 Mac", Matematik: 78, Sains: 65 }, ...]
 */
export function timelineBySubject(rows: ScoreRow[], formatLabel: (date: string) => string) {
  const subjects = [...new Set(rows.map((r) => r.subject))].sort();
  const byDate = new Map<string, Record<string, number | string>>();
  for (const r of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = r.label ? `${r.date}|${r.label}` : r.date;
    if (!byDate.has(key)) byDate.set(key, { label: r.label ?? formatLabel(r.date) });
    byDate.get(key)![r.subject] = r.percent;
  }
  return { subjects, points: [...byDate.values()] };
}
