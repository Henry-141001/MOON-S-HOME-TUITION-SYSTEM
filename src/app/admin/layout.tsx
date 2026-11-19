import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logout } from "@/app/actions/auth";
import { AppShell, type NavItem } from "@/components/app-shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const pending = await prisma.schoolExamination.count({ where: { status: "PENDING", student: { isActive: true } } });

  const nav: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
    { href: "/admin/murid", label: "Maklumat Murid", icon: "students" },
    { href: "/admin/ibu-bapa", label: "Maklumat Ibu Bapa", icon: "parents" },
    { href: "/admin/subjek", label: "Subjek Tuisyen", icon: "subjects" },
    { href: "/admin/kehadiran", label: "Rekod Kehadiran", icon: "attendance" },
    { href: "/admin/markah-tuisyen", label: "Markah Ujian Tuisyen", icon: "tuition" },
    { href: "/admin/ulasan", label: "Ulasan Guru", icon: "comments" },
    { href: "/admin/keputusan-sekolah", label: "Keputusan Ujian Sekolah", icon: "school", badge: pending },
    { href: "/admin/laporan", label: "Laporan", icon: "reports" },
    { href: "/admin/tetapan", label: "Tetapan", icon: "settings" },
  ];

  return (
    <AppShell nav={nav} portalLabel="Portal Admin" userName={admin.name} userMeta={`ID: ${admin.loginId}`} logoutAction={logout}>
      {children}
    </AppShell>
  );
}
