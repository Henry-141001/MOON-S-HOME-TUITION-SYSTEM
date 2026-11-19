import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate, todayISO } from "@/lib/dates";
import { average, percent } from "@/lib/analytics";
import { Card, DemoBadge, EmptyState, PageHeader, PercentPill, Select, Table, buttonClass, cn, td, th } from "@/components/ui";
import { Modal } from "@/components/forms";
import { createTuitionExam } from "@/app/admin/_actions/tuition";
import { ExamForm } from "./exam-form";
import { StudentJump } from "./student-jump";

export const metadata = { title: "Markah Ujian Tuisyen" };

export default async function TuitionExamsPage({ searchParams }: PageProps<"/admin/markah-tuisyen">) {
  await requireAdmin();
  const sp = await searchParams;
  const subjectFilter = typeof sp.subjek === "string" ? sp.subjek : "";

  const [exams, subjects, students] = await Promise.all([
    prisma.tuitionExamination.findMany({
      where: subjectFilter ? { subjectId: subjectFilter } : {},
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { subject: { select: { name: true } }, results: { select: { marksObtained: true } } },
    }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.student.findMany({ where: { isActive: true }, orderBy: { fullName: "asc" }, select: { id: true, fullName: true, studentCode: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Markah Ujian Tuisyen"
        description="Hanya guru boleh memasukkan, mengubah atau memadam markah ujian tuisyen. Ibu bapa hanya boleh melihat."
        actions={
          <Modal
            trigger={
              <>
                <Plus className="size-4" /> Ujian Baharu
              </>
            }
            title="Ujian Tuisyen Baharu"
            description="Selepas disimpan, anda boleh memasukkan markah setiap murid."
          >
            <ExamForm action={createTuitionExam} subjects={subjects} defaults={{ date: todayISO() }} submitLabel="Cipta & Masukkan Markah" />
          </Modal>
        }
      />

      <Card>
        <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <form className="flex items-center gap-2">
            <Select name="subjek" defaultValue={subjectFilter} className="w-52 py-2" aria-label="Tapis subjek">
              <option value="">Semua subjek</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <button type="submit" className={buttonClass("secondary", "sm")}>
              Tapis
            </button>
          </form>
          <StudentJump students={students} />
        </div>

        {exams.length === 0 ? (
          <EmptyState title="Belum ada ujian tuisyen" description="Cipta ujian dahulu, kemudian masukkan markah setiap murid." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Tarikh</th>
                <th className={th}>Ujian</th>
                <th className={th}>Subjek</th>
                <th className={th}>Jumlah Markah</th>
                <th className={th}>Murid</th>
                <th className={th}>Purata Kelas</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="hover:bg-beige-50/60">
                  <td className={cn(td, "whitespace-nowrap")}>{formatDate(e.date)}</td>
                  <td className={cn(td, "font-medium")}>
                    {e.name} {e.isDemo && <DemoBadge />}
                  </td>
                  <td className={td}>{e.subject.name}</td>
                  <td className={td}>{e.totalMarks}</td>
                  <td className={td}>{e.results.length}</td>
                  <td className={td}>
                    <PercentPill value={average(e.results.map((r) => percent(r.marksObtained, e.totalMarks)))} />
                  </td>
                  <td className={cn(td, "text-right")}>
                    <Link href={`/admin/markah-tuisyen/${e.id}`} className="text-sm font-medium text-sage-700 hover:underline">
                      Markah →
                    </Link>
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
