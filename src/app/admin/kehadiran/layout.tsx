import { requireAdmin } from "@/lib/session";
import { PageHeader } from "@/components/ui";
import { SubNav } from "@/components/sub-nav";

export default async function AttendanceLayout({ children }: LayoutProps<"/admin/kehadiran">) {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Rekod Kehadiran" description="Rekod kehadiran setiap sesi tuisyen dan lihat statistik kehadiran." />
      <SubNav
        items={[
          { href: "/admin/kehadiran", label: "Ambil Kehadiran" },
          { href: "/admin/kehadiran/sejarah", label: "Sejarah" },
          { href: "/admin/kehadiran/statistik", label: "Statistik" },
          { href: "/admin/kehadiran/jadual", label: "Jadual Sesi" },
        ]}
      />
      {children}
    </>
  );
}
