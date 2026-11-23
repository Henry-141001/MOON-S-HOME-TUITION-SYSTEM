// Colour for each subject in the class timetable (works in server and client code).
// BI = blue, BM = red, Matematik = green; every other subject uses the brand gold.

export type SubjectColor = { chip: string; bar: string };

const BLUE: SubjectColor = { chip: "bg-blue-100 text-blue-800 ring-blue-200", bar: "bg-blue-500" };
const RED: SubjectColor = { chip: "bg-red-100 text-red-800 ring-red-200", bar: "bg-red-500" };
const GREEN: SubjectColor = { chip: "bg-green-100 text-green-800 ring-green-200", bar: "bg-green-600" };
const OTHER: SubjectColor = { chip: "bg-gold-100 text-gold-600 ring-gold-300", bar: "bg-gold-400" };
const ALL: SubjectColor = { chip: "bg-beige-100 text-ink-soft ring-beige-200", bar: "bg-navy-400" };

export function subjectColor(name: string | null | undefined): SubjectColor {
  if (!name) return ALL;
  const n = name.toLowerCase();
  if (/inggeris|english|\bbi\b/.test(n)) return BLUE;
  if (/melayu|\bbm\b/.test(n)) return RED;
  if (/matematik|math|\b3\s?m\b/.test(n)) return GREEN;
  return OTHER;
}
