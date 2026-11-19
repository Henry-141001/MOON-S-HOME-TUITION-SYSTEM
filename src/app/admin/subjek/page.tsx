import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, PageHeader, Table, cn, td, th } from "@/components/ui";
import { ActionForm, ConfirmButton, Field, InlineAction, Modal, SubmitButton } from "@/components/forms";
import { createSubject, deleteSubject, renameSubject, setSubjectActive } from "@/app/admin/_actions/subjects";

export const metadata = { title: "Subjek Tuisyen" };

export default async function SubjectsPage() {
  await requireAdminView();
  const subjects = await prisma.subject.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { students: true, tuitionExams: true, schoolResults: true } } },
  });

  return (
    <>
      <PageHeader
        title="Subjek Tuisyen"
        description="Senarai subjek digunakan untuk pendaftaran murid, ujian tuisyen dan keputusan peperiksaan sekolah."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          {subjects.length === 0 ? (
            <EmptyState title="Belum ada subjek" description="Tambah subjek pertama menggunakan borang di sebelah." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Subjek</th>
                  <th className={th}>Murid</th>
                  <th className={th}>Ujian Tuisyen</th>
                  <th className={th}>Markah Sekolah</th>
                  <th className={th}>Status</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s) => {
                  const used = s._count.tuitionExams + s._count.schoolResults > 0;
                  return (
                    <tr key={s.id} className={cn(!s.isActive && "opacity-60")}>
                      <td className={cn(td, "font-medium")}>{s.name}</td>
                      <td className={td}>{s._count.students}</td>
                      <td className={td}>{s._count.tuitionExams}</td>
                      <td className={td}>{s._count.schoolResults}</td>
                      <td className={td}>{s.isActive ? <Badge tone="sage">Aktif</Badge> : <Badge tone="neutral">Tidak Aktif</Badge>}</td>
                      <td className={td}>
                        <div className="flex justify-end gap-1.5">
                          <Modal trigger="Namakan Semula" triggerVariant="ghost" triggerSize="sm" title="Namakan Semula Subjek">
                            <ActionForm action={renameSubject.bind(null, s.id)} className="space-y-4">
                              <Field label="Nama subjek" name="name" required>
                                <Input id="name" name="name" defaultValue={s.name} required />
                              </Field>
                              <div className="flex justify-end">
                                <SubmitButton>Simpan</SubmitButton>
                              </div>
                            </ActionForm>
                          </Modal>
                          <InlineAction action={setSubjectActive.bind(null, s.id, !s.isActive)}>
                            <ConfirmButton
                              variant="ghost"
                              message={s.isActive ? `Nyahaktifkan ${s.name}? Rekod lama kekal, tetapi subjek tidak lagi dipaparkan sebagai pilihan baharu.` : `Aktifkan semula ${s.name}?`}
                            >
                              {s.isActive ? "Nyahaktif" : "Aktifkan"}
                            </ConfirmButton>
                          </InlineAction>
                          {!used && (
                            <InlineAction action={deleteSubject.bind(null, s.id)}>
                              <ConfirmButton message={`Padam subjek ${s.name}?`}>Padam</ConfirmButton>
                            </InlineAction>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card className="h-fit">
          <CardHeader title="Tambah Subjek" icon={<Plus className="size-4" />} />
          <CardBody>
            <ActionForm action={createSubject} resetOnSuccess className="space-y-4">
              <Field label="Nama subjek" name="name" required>
                <Input id="name" name="name" placeholder="cth. Matematik" required />
              </Field>
              <SubmitButton className="w-full">Tambah</SubmitButton>
            </ActionForm>
            <p className="mt-4 text-xs text-muted">
              Subjek yang sudah mempunyai markah tidak boleh dipadam supaya rekod sejarah kekal. Gunakan &ldquo;Nyahaktif&rdquo;.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
