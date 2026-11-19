import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime, todayISO } from "@/lib/dates";
import { getStudentRecords } from "@/lib/records";
import { SUBMISSION_LABELS } from "@/lib/constants";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  PercentPill,
  RowChevron,
  Textarea,
  linkClass,
  submissionTone,
} from "@/components/ui";
import { ActionForm, ConfirmButton, Field, InlineAction, Modal, SubmitButton } from "@/components/forms";
import { SchoolExamCard } from "@/components/records";
import { SchoolExamForm } from "@/components/school-exam-form";
import {
  adminDeleteSchoolExam,
  adminUpdateSchoolExam,
  approveSchoolExam,
  requestSchoolCorrection,
  setSchoolExamPending,
} from "@/app/admin/_actions/school";

export const metadata = { title: "Semakan Keputusan Sekolah" };

export default async function SchoolExamReviewPage({ params }: PageProps<"/admin/keputusan-sekolah/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const exam = await prisma.schoolExamination.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, fullName: true, studentCode: true, yearForm: true, school: true } },
      submittedBy: { select: { name: true, parentCode: true, phone: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  if (!exam) notFound();

  const [records, subjects] = await Promise.all([
    getStudentRecords(exam.student.id, { audience: "admin" }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const current = records.school.find((e) => e.id === exam.id)!;
  const others = records.school.filter((e) => e.id !== exam.id);

  return (
    <>
      <PageHeader
        title="Semakan Keputusan Sekolah"
        description={
          <>
            <Link href={`/admin/murid/${exam.student.id}?tab=akademik`} className={linkClass}>
              {exam.student.fullName}
            </Link>{" "}
            · {exam.student.studentCode} · {exam.student.yearForm} · {exam.student.school}
          </>
        }
        actions={<ButtonLink href="/admin/keputusan-sekolah" variant="secondary">Kembali</ButtonLink>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SchoolExamCard
            exam={current}
            actions={
              <Modal
                trigger={
                  <>
                    <Pencil className="size-4" /> Edit Markah
                  </>
                }
                triggerVariant="secondary"
                triggerSize="sm"
                title="Betulkan Keputusan"
                description="Pembetulan oleh admin. Status semasa tidak berubah."
                wide
              >
                <SchoolExamForm
                  action={adminUpdateSchoolExam.bind(null, exam.id)}
                  subjects={subjects}
                  maxDate={todayISO()}
                  defaults={{
                    examType: current.examType,
                    examName: current.examName,
                    examDate: current.date,
                    remarks: current.remarks,
                    rows: current.results.map((r) => ({ subjectId: r.subjectId, marks: r.marks, total: r.total })),
                  }}
                  submitLabel="Simpan Pembetulan"
                />
              </Modal>
            }
          />

          <Card>
            <CardHeader title="Keputusan Sekolah Terdahulu" description={`${others.length} rekod lain untuk murid ini`} />
            {others.length === 0 ? (
              <CardBody>
                <p className="text-sm text-muted">Tiada rekod lain.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-line">
                {others.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/admin/keputusan-sekolah/${e.id}`}
                      className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-beige-50 active:bg-beige-100"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink">{e.title}</span>
                        <span className="text-xs text-muted">{formatDate(e.date)}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <PercentPill value={e.overall} />
                        <span className="hidden sm:inline-flex">
                          <Badge tone={submissionTone[e.status]}>{SUBMISSION_LABELS[e.status]}</Badge>
                        </span>
                        <RowChevron />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Status Semakan" />
            <CardBody className="space-y-4">
              <div className="space-y-1 text-sm">
                <p>
                  <Badge tone={submissionTone[exam.status]}>{SUBMISSION_LABELS[exam.status]}</Badge>
                </p>
                <p className="text-xs text-muted">
                  Dihantar {formatDateTime(exam.createdAt)} oleh {exam.submittedBy ? `${exam.submittedBy.name} (${exam.submittedBy.parentCode})` : "—"}
                </p>
                {exam.updatedAt.getTime() - exam.createdAt.getTime() > 1000 && (
                  <p className="text-xs text-muted">Kemas kini terakhir {formatDateTime(exam.updatedAt)}</p>
                )}
                {exam.reviewedAt && (
                  <p className="text-xs text-muted">
                    Disemak {formatDateTime(exam.reviewedAt)}
                    {exam.reviewedBy ? ` oleh ${exam.reviewedBy.name}` : ""}
                  </p>
                )}
              </div>

              {exam.status !== "APPROVED" && (
                <InlineAction action={approveSchoolExam.bind(null, exam.id)} className="w-full items-stretch">
                  <ConfirmButton variant="primary" size="md" className="w-full" message="Luluskan keputusan ini? Ibu bapa tidak lagi boleh mengubahnya.">
                    <CheckCircle2 className="size-4" /> Luluskan
                  </ConfirmButton>
                </InlineAction>
              )}
              {exam.status !== "PENDING" && (
                <InlineAction action={setSchoolExamPending.bind(null, exam.id)} className="w-full items-stretch">
                  <ConfirmButton variant="secondary" size="md" className="w-full" message="Tukar status kembali kepada Menunggu Semakan?">
                    <RotateCcw className="size-4" /> Tandakan Menunggu Semakan
                  </ConfirmButton>
                </InlineAction>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Minta Pembetulan" description="Catatan ini akan dipaparkan kepada ibu bapa." />
            <CardBody>
              <ActionForm action={requestSchoolCorrection.bind(null, exam.id)} className="space-y-3">
                <Field label="Apa yang perlu dibetulkan?" name="adminNote" required>
                  <Textarea
                    id="adminNote"
                    name="adminNote"
                    defaultValue={exam.status === "NEEDS_CORRECTION" ? exam.adminNote ?? "" : ""}
                    placeholder="cth. Markah Sains sepatutnya daripada 100, bukan 50."
                  />
                </Field>
                <SubmitButton variant="secondary" className="w-full">
                  Hantar Permintaan Pembetulan
                </SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>

          <InlineAction action={adminDeleteSchoolExam.bind(null, exam.id)} className="w-full items-stretch">
            <ConfirmButton size="md" className="w-full" message="Padam keputusan ini secara kekal? Tindakan ini tidak boleh dibatalkan.">
              <Trash2 className="size-4" /> Padam Rekod
            </ConfirmButton>
          </InlineAction>
        </div>
      </div>
    </>
  );
}
