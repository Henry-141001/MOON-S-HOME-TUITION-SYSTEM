import "server-only";
import { prisma } from "@/lib/prisma";
import { formatLongDate } from "@/lib/dates";
import { formatTime12 } from "@/lib/schedule";
import type { SessionStatusValue } from "@/lib/constants";

type SessionInfo = {
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  notes: string | null;
  status: SessionStatusValue;
  subjectIds: string[];
};

/** Statuses parents are told about automatically when a class is set to them. */
export function statusNeedsNotice(status: SessionStatusValue) {
  return status === "CANCELLED" || status === "HOLIDAY" || status === "REPLACEMENT";
}

/**
 * Sends an in-app notification to every active parent whose child is in this class
 * (children taking any of its subjects, or all children for a class with no subject).
 * Returns how many parents were notified.
 */
export async function notifyParentsAboutSession(s: SessionInfo): Promise<number> {
  if (!statusNeedsNotice(s.status)) return 0;
  const links = await prisma.parentStudent.findMany({
    where: {
      parent: { isActive: true },
      student: {
        isActive: true,
        ...(s.subjectIds.length ? { subjects: { some: { subjectId: { in: s.subjectIds } } } } : {}),
      },
    },
    select: { parentId: true },
    distinct: ["parentId"],
  });
  if (links.length === 0) return 0;

  const when = `${formatLongDate(s.date)}, ${formatTime12(s.startTime)} – ${formatTime12(s.endTime)}`;
  const note = s.notes ? ` Nota: ${s.notes}` : "";
  const message = {
    CANCELLED: { title: "Kelas dibatalkan", body: `Kelas "${s.title}" pada ${when} telah dibatalkan.${note}` },
    HOLIDAY: { title: "Cuti — tiada kelas", body: `Tiada kelas "${s.title}" pada ${formatLongDate(s.date)} (cuti).${note}` },
    REPLACEMENT: { title: "Kelas ganti", body: `Kelas ganti "${s.title}" akan diadakan pada ${when}.${note}` },
  }[s.status as "CANCELLED" | "HOLIDAY" | "REPLACEMENT"];

  await prisma.notification.createMany({
    data: links.map((l) => ({ parentId: l.parentId, title: message.title, body: message.body.slice(0, 600), link: "/ibu-bapa/jadual" })),
  });
  return links.length;
}
