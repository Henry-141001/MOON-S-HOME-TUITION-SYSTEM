import { notFound } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatLongDate, toISODate } from "@/lib/dates";
import { average, percent } from "@/lib/analytics";
import { ButtonLink, Card, CardHeader, DemoBadge, EmptyState, PageHeader, PercentPill } from "@/components/ui";
import { ConfirmButton, InlineAction, Modal } from "@/components/forms";
import { deleteTuitionExam, saveTuitionResults, updateTuitionExam } from "@/app/admin/_actions/tuition";
import { ExamForm } from "../exam-form";
import { MarksSheet } from "./marks-sheet";

export const metadata = { title: "Markah Ujian" };

export default async function TuitionExamPage({ params }: PageProps<"/admin/markah-tuisyen/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const exam = await prisma.tuitionExamination.findUnique({
    where: { id },
    include: {
      subject: true,
      results: { select: { studentId: true, marksObtained: true, remarks: true } },
    },
  });
  if (!exam) notFound();

  const [students, subjects] = await Promise.all([
    prisma.student.findMany({
      where: { OR: [{ isActive: true }, { tuitionResults: { some: { examId: exam.id } } }] },
      orderBy: { studentCode: "asc" },
      select: {
        id: true,
        studentCode: true,
        fullName: true,
        isActive: true,
        subjects: { where: { subjectId: exam.subjectId }, select: { subjectId: true } },
      },
    }),
    prisma.subject.findMany({
      where: { OR: [{ isActive: true }, { id: exam.subjectId }] },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const results = new Map(exam.results.map((r) => [r.studentId, r]));
  // Enrolled students first, then the rest.
  const rows = students
    .map((s) => ({
      id: s.id,
      code: s.studentCode,
      name: s.fullName,
      enrolled: s.subjects.length > 0,
      inactive: !s.isActive,
      marks: results.has(s.id) ? String(results.get(s.id)!.marksObtained) : "",
      remarks: results.get(s.id)?.remarks ?? "",
    }))
    .sort((a, b) => Number(b.enrolled) - Number(a.enrolled));

  const avg = average(exam.results.map((r) => percent(r.marksObtained, exam.totalMarks)));

  return (
    <>
      <PageHeader
        title={exam.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {exam.subject.name} · {formatLongDate(exam.date)} · Jumlah markah {exam.totalMarks}
            {exam.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <>
            <ButtonLink href="/admin/markah-tuisyen" variant="secondary">
              Kembali
            </ButtonLink>
            <Modal
              trigger={
                <>
                  <Pencil className="size-4" /> Edit Ujian
                </>
              }
              triggerVariant="secondary"
              title="Kemas Kini Ujian"
            >
              <ExamForm
                action={updateTuitionExam.bind(null, exam.id)}
                subjects={subjects}
                defaults={{
                  name: exam.name,
                  subjectId: exam.subjectId,
                  date: toISODate(exam.date),
                  totalMarks: exam.totalMarks,
                  remarks: exam.remarks,
                }}
                submitLabel="Simpan Perubahan"
              />
            </Modal>
            <InlineAction action={deleteTuitionExam.bind(null, exam.id)}>
              <ConfirmButton size="md" message={`Padam ujian "${exam.name}" berserta semua markahnya? Tindakan ini tidak boleh dibatalkan.`}>
                <Trash2 className="size-4" /> Padam
              </ConfirmButton>
            </InlineAction>
          </>
        }
      />

      <Card>
        <CardHeader
          title="Markah Murid"
          description={exam.remarks ?? "Masukkan markah setiap murid. Peratus dikira secara automatik."}
          actions={
            <span className="flex items-center gap-2 text-sm text-muted">
              Purata kelas: <PercentPill value={avg} />
            </span>
          }
        />
        {rows.length === 0 ? (
          <EmptyState title="Tiada murid aktif" />
        ) : (
          <MarksSheet rows={rows} totalMarks={exam.totalMarks} action={saveTuitionResults.bind(null, exam.id)} />
        )}
      </Card>
    </>
  );
}
