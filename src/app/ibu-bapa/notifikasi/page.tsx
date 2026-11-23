import Link from "next/link";
import { Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/dates";
import { Badge, Card, EmptyState, PageHeader, cn } from "@/components/ui";
import { getParentView, withChild } from "../_view";

export const metadata = { title: "Notifikasi" };

export default async function ParentNotificationsPage({ searchParams }: PageProps<"/ibu-bapa/notifikasi">) {
  const { parent, child, readOnly } = await getParentView(searchParams);
  const items = await prisma.notification.findMany({
    where: { parentId: parent.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  // Opening this page counts as reading them (they stay marked "Baharu" on this visit).
  // The read-only observer never changes anything.
  if (!readOnly && items.some((n) => !n.readAt)) {
    await prisma.notification.updateMany({ where: { parentId: parent.id, readAt: null }, data: { readAt: new Date() } });
  }

  return (
    <>
      <PageHeader title="Notifikasi" description="Makluman daripada Moons HomeTuition, contohnya perubahan jadual kelas." />
      <Card>
        {items.length === 0 ? (
          <EmptyState title="Tiada notifikasi" description="Makluman seperti kelas dibatalkan akan dipaparkan di sini." />
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => (
              <li key={n.id} className={cn("flex gap-3 px-5 py-4", !n.readAt && "bg-gold-100/40")}>
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-navy-50 text-navy-700">
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {n.title}
                    {!n.readAt && <Badge tone="gold">Baharu</Badge>}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{n.body}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                    {formatDateTime(n.createdAt)}
                    {n.link && (
                      <Link href={child ? withChild(n.link, child.id) : n.link} className="font-medium text-navy-700 underline underline-offset-2">
                        Lihat jadual
                      </Link>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
