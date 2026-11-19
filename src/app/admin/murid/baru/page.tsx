import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { todayISO } from "@/lib/dates";
import { nextStudentCode } from "@/lib/codes";
import { ButtonLink, Card, CardBody, PageHeader } from "@/components/ui";
import { createStudent } from "@/app/admin/_actions/students";
import { StudentForm } from "../student-form";

export const metadata = { title: "Tambah Murid" };

export default async function NewStudentPage() {
  await requireAdmin();
  const [subjects, parents, code] = await Promise.all([
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
    prisma.parent.findMany({ where: { isActive: true }, orderBy: { parentCode: "asc" }, select: { id: true, name: true, parentCode: true } }),
    nextStudentCode(),
  ]);

  return (
    <>
      <PageHeader
        title="Tambah Murid Baharu"
        description="Murid akan diberikan ID Murid yang unik."
        actions={<ButtonLink href="/admin/murid" variant="secondary">Kembali</ButtonLink>}
      />
      <Card className="max-w-3xl">
        <CardBody className="py-6">
          <StudentForm
            action={createStudent}
            defaults={{ registrationDate: todayISO() }}
            subjects={subjects}
            parents={parents}
            submitLabel="Simpan Murid"
            codeHint={`Biarkan kosong untuk ID automatik (${code}).`}
          />
        </CardBody>
      </Card>
    </>
  );
}
