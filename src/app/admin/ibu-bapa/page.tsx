import Link from "next/link";
import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { Badge, ButtonLink, Card, DemoBadge, EmptyState, PageHeader, Table, cn, linkClass, td, th } from "@/components/ui";
import { Modal } from "@/components/forms";
import { createParent } from "@/app/admin/_actions/parents";
import { ParentForm } from "./parent-form";
import { CopyCode } from "./copy-code";
import { ObserveParentButton } from "./observe-button";
import { observeParent } from "@/app/admin/_actions/observer";

export const metadata = { title: "Maklumat Ibu Bapa" };

export default async function ParentsPage() {
  const viewer = await requireAdminView();
  const [parents, students] = await Promise.all([
    prisma.parent.findMany({
      orderBy: [{ isActive: "desc" }, { parentCode: "asc" }],
      include: {
        children: { include: { student: { select: { id: true, fullName: true, studentCode: true, isActive: true } } } },
        _count: { select: { submissions: true } },
      },
    }),
    prisma.student.findMany({
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, studentCode: true, isActive: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Maklumat Ibu Bapa"
        description="Setiap keluarga mempunyai satu ID Ibu Bapa yang unik. Satu ID boleh dipautkan kepada beberapa orang anak."
        actions={
          <Modal
            trigger={
              <>
                <Plus className="size-4" /> Tambah Ibu Bapa
              </>
            }
            title="Akaun Ibu Bapa Baharu"
            description="ID Ibu Bapa akan dijana secara automatik jika dibiarkan kosong."
            wide
          >
            <ParentForm action={createParent} students={students} submitLabel="Cipta Akaun" />
          </Modal>
        }
      />

      <div className="mb-4 flex items-start gap-3 rounded-2xl border border-sky-soft bg-sky-soft/50 px-4 py-3 text-[13px] text-sky-ink">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" />
        <p>
          ID Ibu Bapa berfungsi seperti kunci. Berikan ID secara peribadi (cth. WhatsApp terus kepada ibu bapa). Jika ID
          tersebar, jana ID baharu atau tetapkan PIN di halaman akaun tersebut.
        </p>
      </div>

      <Card>
        {parents.length === 0 ? (
          <EmptyState title="Belum ada akaun ibu bapa" description="Cipta akaun dan pautkan kepada anak masing-masing." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>ID Ibu Bapa</th>
                <th className={th}>Nama</th>
                <th className={th}>Anak</th>
                <th className={th}>Keselamatan</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {parents.map((p) => (
                <tr key={p.id} className={cn(!p.isActive && "opacity-60")}>
                  <td className={td}>
                    <CopyCode code={p.parentCode} />
                  </td>
                  <td className={td}>
                    <p className="font-medium">{p.name}</p>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                      {p.phone || "Tiada telefon"} {p.isDemo && <DemoBadge />}
                    </p>
                  </td>
                  <td className={td}>
                    {p.children.length === 0 ? (
                      <span className="text-xs text-rose-ink">Belum dipautkan</span>
                    ) : (
                      <ul className="space-y-0.5">
                        {p.children.map((c) => (
                          <li key={c.studentId} className="text-sm">
                            <Link href={`/admin/murid/${c.student.id}`} className={linkClass}>
                              {c.student.fullName}
                            </Link>
                            {c.relationship && <span className="text-xs text-muted"> · {c.relationship}</span>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className={td}>
                    {p.pinHash ? (
                      <Badge tone="sage">
                        <KeyRound className="size-3" /> ID + PIN
                      </Badge>
                    ) : (
                      <Badge tone="beige">ID sahaja</Badge>
                    )}
                  </td>
                  <td className={td}>{p.isActive ? <Badge tone="sage">Aktif</Badge> : <Badge tone="neutral">Tidak Aktif</Badge>}</td>
                  <td className={cn(td, "text-right")}>
                    <div className="flex justify-end gap-2">
                      {viewer.readOnly && <ObserveParentButton action={observeParent.bind(null, p.id)} />}
                      <ButtonLink href={`/admin/ibu-bapa/${p.id}`} variant="ghost" size="sm" arrow>
                        {viewer.readOnly ? "Butiran" : "Urus"}
                      </ButtonLink>
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
