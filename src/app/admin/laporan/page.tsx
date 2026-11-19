import Link from "next/link";
import { Download, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { Card, DemoBadge, EmptyState, PageHeader, Table, buttonClass, cn, td, th } from "@/components/ui";
import { StudentAvatar } from "@/components/records";

export const metadata = { title: "Laporan" };

export default async function ReportsPage() {
  await requireAdmin();
  const students = await prisma.student.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      studentCode: true,
      fullName: true,
      yearForm: true,
      isDemo: true,
      photo: { select: { updatedAt: true } },
      _count: { select: { tuitionResults: true, attendance: true, comments: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Laporan Prestasi Murid"
        description="Jana laporan individu yang profesional untuk dikongsi dengan ibu bapa — lihat, cetak atau muat turun PDF."
      />
      <Card>
        {students.length === 0 ? (
          <EmptyState title="Tiada murid aktif" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Murid</th>
                <th className={th}>Tahun/Tingkatan</th>
                <th className={th}>Ujian Tuisyen</th>
                <th className={th}>Kehadiran</th>
                <th className={th}>Ulasan</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <StudentAvatar studentId={s.id} name={s.fullName} photoVersion={s.photo?.updatedAt} size={36} />
                      <div>
                        <p className="font-medium">{s.fullName}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted">
                          {s.studentCode} {s.isDemo && <DemoBadge />}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>{s.yearForm}</td>
                  <td className={td}>{s._count.tuitionResults}</td>
                  <td className={td}>{s._count.attendance}</td>
                  <td className={td}>{s._count.comments}</td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/laporan/${s.id}`} className={buttonClass("soft", "sm")}>
                        <FileText className="size-4" /> Lihat
                      </Link>
                      <a href={`/api/laporan/${s.id}`} className={buttonClass("secondary", "sm")}>
                        <Download className="size-4" /> PDF
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
