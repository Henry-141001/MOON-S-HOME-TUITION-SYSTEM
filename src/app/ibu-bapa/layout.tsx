import { prisma } from "@/lib/prisma";
import { getParentChildren, requireParentView } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { stopObservingParent } from "@/app/admin/_actions/observer";
import { AppShell, type NavItem } from "@/components/app-shell";

const NAV: NavItem[] = [
  { href: "/ibu-bapa", label: "Maklumat Murid", icon: "profile", exact: true },
  { href: "/ibu-bapa/notifikasi", label: "Notifikasi", icon: "notifications" },
  { href: "/ibu-bapa/jadual", label: "Jadual Kelas", icon: "schedule" },
  { href: "/ibu-bapa/kehadiran", label: "Rekod Kehadiran", icon: "attendance" },
  { href: "/ibu-bapa/tuisyen", label: "Pencapaian Tuisyen", icon: "achievement" },
  { href: "/ibu-bapa/ulasan", label: "Ulasan Guru", icon: "comments" },
  { href: "/ibu-bapa/galeri", label: "Galeri Kelas", icon: "gallery" },
  { href: "/ibu-bapa/sekolah", label: "Keputusan Ujian Sekolah", icon: "school" },
  { href: "/ibu-bapa/analisis", label: "Analisis Prestasi", icon: "analysis" },
];

export default async function ParentLayout({ children }: LayoutProps<"/ibu-bapa">) {
  const { parent, readOnly } = await requireParentView();
  const kids = await getParentChildren(parent.id);
  // Teacher replies (on published comments about this parent's children) not yet seen.
  const [newReplies, newNotices] = await Promise.all([
    prisma.commentReply.count({
      where: { authorType: "ADMIN", readAt: null, comment: { isPublished: true, studentId: { in: kids.map((k) => k.id) } } },
    }),
    prisma.notification.count({ where: { parentId: parent.id, readAt: null } }),
  ]);
  const badges: Record<string, number> = { "/ibu-bapa/ulasan": newReplies, "/ibu-bapa/notifikasi": newNotices };
  const nav = NAV.map((item) => (badges[item.href] ? { ...item, badge: badges[item.href] } : item));
  return (
    <AppShell
      nav={nav}
      portalLabel={readOnly ? "Portal Ibu Bapa · Pemerhati" : "Portal Ibu Bapa"}
      userName={parent.name}
      userMeta={`ID: ${parent.parentCode}`}
      logoutAction={logout}
      childSwitcher={kids.map((k) => ({ id: k.id, name: k.fullName, code: k.studentCode }))}
      readOnly={readOnly ? { kind: "parent", parentName: `${parent.name} (${parent.parentCode})`, exitAction: stopObservingParent } : undefined}
    >
      {children}
    </AppShell>
  );
}
