import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/dates";
import { Badge, ButtonLink, Card, DemoBadge, EmptyState, Input, PageHeader, Select, Table, buttonClass, cn, linkClass, td, th } from "@/components/ui";
import { StudentAvatar } from "@/components/records";

export const metadata = { title: "Maklumat Murid" };

export default async function StudentsPage({ searchParams }: PageProps<"/admin/murid">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = sp.status === "semua" || sp.status === "tidak-aktif" ? sp.status : "aktif";

  const students = await prisma.student.findMany({
    where: {
      ...(status === "aktif" ? { isActive: true } : status === "tidak-aktif" ? { isActive: false } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { studentCode: { contains: q, mode: "insensitive" } },
              { school: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ isActive: "desc" }, { studentCode: "asc" }],
    select: {
      id: true,
      studentCode: true,
      fullName: true,
      school: true,
      yearForm: true,
      guardianName: true,
      registrationDate: true,
      isActive: true,
      isDemo: true,
      photo: { select: { updatedAt: true } },
      parents: { select: { parent: { select: { parentCode: true } } } },
      _count: { select: { subjects: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Maklumat Murid"
        description="Urus profil murid, subjek dan pautan ibu bapa."
        actions={
          <ButtonLink href="/admin/murid/baru">
            <Plus className="size-4" /> Tambah Murid
          </ButtonLink>
        }
      />

      <Card>
        <form className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input name="q" defaultValue={q} placeholder="Cari nama, ID murid atau sekolah…" className="pl-9" />
          </div>
          <Select name="status" defaultValue={status} className="sm:w-44">
            <option value="aktif">Aktif</option>
            <option value="tidak-aktif">Tidak aktif</option>
            <option value="semua">Semua</option>
          </Select>
          <button type="submit" className={buttonClass("secondary")}>
            Tapis
          </button>
        </form>

        {students.length === 0 ? (
          <EmptyState
            title={q ? "Tiada murid sepadan dengan carian" : "Belum ada murid"}
            action={!q && <ButtonLink href="/admin/murid/baru" variant="soft" size="sm">Tambah murid pertama</ButtonLink>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Murid</th>
                <th className={th}>Sekolah</th>
                <th className={th}>Tahun/Tingkatan</th>
                <th className={th}>ID Ibu Bapa</th>
                <th className={th}>Subjek</th>
                <th className={th}>Didaftar</th>
                <th className={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className={cn("hover:bg-beige-50/60", !s.isActive && "opacity-60")}>
                  <td className={td}>
                    <Link href={`/admin/murid/${s.id}`} className="flex items-center gap-3">
                      <StudentAvatar studentId={s.id} name={s.fullName} photoVersion={s.photo?.updatedAt} size={38} />
                      <span className="min-w-0">
                        <span className={cn("block truncate", linkClass)}>{s.fullName}</span>
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          {s.studentCode} {s.isDemo && <DemoBadge />}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className={td}>{s.school}</td>
                  <td className={td}>{s.yearForm}</td>
                  <td className={cn(td, "font-mono text-xs")}>
                    {s.parents.length ? s.parents.map((p) => p.parent.parentCode).join(", ") : <span className="text-muted">Belum dipautkan</span>}
                  </td>
                  <td className={td}>{s._count.subjects}</td>
                  <td className={cn(td, "whitespace-nowrap")}>{formatDate(s.registrationDate)}</td>
                  <td className={td}>{s.isActive ? <Badge tone="sage">Aktif</Badge> : <Badge tone="neutral">Tidak Aktif</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <p className="px-4 py-3 text-xs text-muted">{students.length} murid dipaparkan</p>
      </Card>
    </>
  );
}
