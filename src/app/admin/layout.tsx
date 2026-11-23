import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const viewer = await requireAdminView();
  const [pending, newReplies] = await Promise.all([
    prisma.schoolExamination.count({ where: { status: "PENDING", student: { isActive: true } } }),
    // Parent replies under teacher comments that the teacher has not opened yet.
    prisma.commentReply.count({ where: { authorType: "PARENT", readAt: null, comment: { student: { isActive: true } } } }),
  ]);

  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/admin/murid", label: "Maklumat Murid", icon: "students" },
    { href: "/admin/ibu-bapa", label: "Maklumat Ibu Bapa", icon: "parents" },
    { href: "/admin/subjek", label: "Subjek Tuisyen", icon: "subjects" },
    { href: "/admin/kehadiran", label: "Rekod Kehadiran", icon: "attendance" },
    { href: "/admin/markah-tuisyen", label: "Markah Ujian Tuisyen", icon: "tuition" },
    { href: "/admin/ulasan", label: "Ulasan Guru", icon: "comments", badge: newReplies },
    { href: "/admin/galeri", label: "Galeri Kelas", icon: "gallery" },
    { href: "/admin/keputusan-sekolah", label: "Keputusan Ujian Sekolah", icon: "school", badge: pending },
    { href: "/admin/laporan", label: "Laporan", icon: "reports" },
    // The observer gets the activity log instead of the admin's settings.
    viewer.readOnly
      ? { href: "/admin/aktiviti", label: "Log Aktiviti", icon: "activity" }
      : { href: "/admin/tetapan", label: "Tetapan", icon: "settings" },
  ];

  return (
    <AppShell
      nav={nav}
      portalLabel={viewer.readOnly ? "Pemerhati · Paparan sahaja" : "Portal Admin"}
      userName={viewer.name}
      userMeta={viewer.readOnly ? "Super Admin (Pemerhati)" : `ID: ${viewer.loginId}`}
      logoutAction={logout}
      readOnly={viewer.readOnly ? { kind: "admin" } : undefined}
    >
      {children}
    </AppShell>
  );
}
