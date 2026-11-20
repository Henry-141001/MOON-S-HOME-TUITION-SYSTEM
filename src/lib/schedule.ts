import "server-only";
import { prisma } from "@/lib/prisma";
import { APP_TIME_ZONE, addDaysISO, parseISODate, todayISO, toISODate } from "@/lib/dates";

/** Current time in Malaysia as "HH:MM". */
function nowHHMM() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

/**
 * Upcoming tuition classes relevant to one student: classes for a subject the
 * student is enrolled in, plus general classes with no subject set.
 * Classes that already finished today are skipped.
 */
export async function upcomingClassesForStudent(subjectIds: string[], take = 4) {
  const today = todayISO();
  const sessions = await prisma.tuitionSession.findMany({
    where: {
      date: { gte: parseISODate(today) },
      OR: [{ subjectId: null }, ...(subjectIds.length ? [{ subjectId: { in: subjectIds } }] : [])],
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: take + 4,
    include: { subject: { select: { name: true } } },
  });
  const now = nowHHMM();
  return sessions
    .map((s) => ({ ...s, dateISO: toISODate(s.date) }))
    .filter((s) => !(s.dateISO === today && s.endTime <= now))
    .slice(0, take)
    .map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject?.name ?? null,
      notes: s.notes,
      date: s.dateISO,
      startTime: s.startTime,
      endTime: s.endTime,
      when: s.dateISO === today ? "Hari ini" : s.dateISO === addDaysISO(today, 1) ? "Esok" : null,
      ongoing: s.dateISO === today && s.startTime <= now && now < s.endTime,
    }));
}

/** "15:00" → "3:00 ptg" (Malay 12-hour clock). */
export function formatTime12(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h < 12 ? "pg" : h < 14 ? "tgh" : h < 19 ? "ptg" : "mlm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
