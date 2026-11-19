import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarCheck, FileText, Pencil, Plus, Power, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatDate, toISODate } from "@/lib/dates";
import { getStudentRecords } from "@/lib/records";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  DemoBadge,
  EmptyState,
  PageHeader,
  RowChevron,
  TabLinks,
} from "@/components/ui";
import { ConfirmButton, InlineAction, Modal } from "@/components/forms";
import {
  AttendanceHistoryTable,
  AttendanceStats,
  CommentsList,
  InfoGrid,
  MonthlyAttendanceTable,
  PerformanceAnalysis,
  SchoolExamCard,
  SectionTitle,
  StudentAvatar,
  SubjectChips,
  TuitionResultsTable,
} from "@/components/records";
import {
  deleteStudent,
  removeStudentPhoto,
  setStudentActive,
  updateStudent,
  uploadStudentPhoto,
} from "@/app/admin/_actions/students";
import { StudentForm } from "../student-form";
import { PhotoUploader } from "../photo-uploader";

export const metadata = { title: "Profil Murid" };

const TABS = [
  { key: "maklumat", label: "Maklumat" },
  { key: "akademik", label: "Rekod Akademik" },
  { key: "kehadiran", label: "Kehadiran" },
  { key: "ulasan", label: "Ulasan Guru" },
  { key: "analisis", label: "Analisis Prestasi" },
] as const;

export default async function StudentProfilePage({ params, searchParams }: PageProps<"/admin/murid/[id]">) {
  await requireAdminView();
  const { id } = await params;
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "maklumat";

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      photo: { select: { updatedAt: true } },
      subjects: { include: { subject: true }, orderBy: { subject: { name: "asc" } } },
      parents: { include: { parent: { select: { id: true, name: true, parentCode: true, phone: true, isActive: true } } } },
    },
  });
  if (!student) notFound();

  const [records, subjects] = await Promise.all([
    getStudentRecords(student.id, { audience: "admin" }),
    prisma.subject.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, isActive: true } }),
  ]);

  return (
    <>
      <PageHeader
        title={student.fullName}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            {student.studentCode} · {student.yearForm} · {student.school}
            {student.isActive ? <Badge tone="sage">Aktif</Badge> : <Badge tone="neutral">Tidak Aktif</Badge>}
            {student.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <>
            <ButtonLink href={`/admin/laporan/${student.id}`} variant="secondary">
              <FileText className="size-4" /> Laporan
            </ButtonLink>
            <Modal
              trigger={
                <>
                  <Pencil className="size-4" /> Kemas Kini
                </>
              }
              title="Kemas Kini Maklumat Murid"
              wide
            >
              <StudentForm
                action={updateStudent.bind(null, student.id)}
                defaults={{
                  studentCode: student.studentCode,
                  fullName: student.fullName,
                  school: student.school,
                  yearForm: student.yearForm,
                  guardianName: student.guardianName,
                  registrationDate: toISODate(student.registrationDate),
                  notes: student.notes,
                  subjectIds: student.subjects.map((s) => s.subjectId),
                }}
                subjects={subjects}
                submitLabel="Simpan Perubahan"
              />
            </Modal>
          </>
        }
      />

      <TabLinks items={TABS.map((t) => ({ href: `/admin/murid/${student.id}?tab=${t.key}`, label: t.label, active: t.key === tab }))} />

      {tab === "maklumat" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Profil Murid" />
            <CardBody className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <StudentAvatar studentId={student.id} name={student.fullName} photoVersion={student.photo?.updatedAt} size={88} />
                <PhotoUploader
                  upload={uploadStudentPhoto.bind(null, student.id)}
                  remove={removeStudentPhoto.bind(null, student.id)}
                  hasPhoto={Boolean(student.photo)}
                />
              </div>
              <InfoGrid
                items={[
                  { label: "ID Murid", value: <span className="font-mono">{student.studentCode}</span> },
                  { label: "Nama Penuh", value: student.fullName },
                  { label: "Sekolah", value: student.school },
                  { label: "Tahun / Tingkatan", value: student.yearForm },
                  { label: "Ibu Bapa / Penjaga", value: student.guardianName },
                  { label: "Tarikh Pendaftaran", value: formatDate(student.registrationDate) },
                  { label: "Status", value: student.isActive ? "Aktif" : "Tidak Aktif" },
                ]}
              />
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Subjek Didaftarkan</p>
                <SubjectChips subjects={student.subjects.map((s) => s.subject.name)} />
              </div>
              {student.notes && (
                <div className="rounded-xl bg-beige-50 px-4 py-3 text-sm text-ink-soft">
                  <span className="font-medium">Catatan admin:</span> {student.notes}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader
                title="Akaun Ibu Bapa"
                actions={<ButtonLink href="/admin/ibu-bapa" variant="ghost" size="sm" arrow>Urus</ButtonLink>}
              />
              {student.parents.length === 0 ? (
                <EmptyState
                  title="Belum dipautkan"
                  description="Pautkan murid ini kepada ID Ibu Bapa supaya ibu bapa boleh melihat rekodnya."
                />
              ) : (
                <ul className="divide-y divide-line">
                  {student.parents.map(({ parent, relationship }) => (
                    <li key={parent.id}>
                      <Link
                        href={`/admin/ibu-bapa/${parent.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-beige-50 active:bg-beige-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">{parent.name}</p>
                          <p className="mt-0.5 font-mono text-xs text-ink-soft">{parent.parentCode}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {[relationship, parent.phone, parent.isActive ? null : "Akaun tidak aktif"].filter(Boolean).join(" · ") || "—"}
                          </p>
                        </div>
                        <RowChevron />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <CardHeader title="Tindakan" />
              <CardBody className="space-y-3">
                <InlineAction action={setStudentActive.bind(null, student.id, !student.isActive)} className="w-full items-stretch">
                  <ConfirmButton
                    variant="secondary"
                    size="md"
                    className="w-full"
                    message={
                      student.isActive
                        ? "Nyahaktifkan murid ini? Rekod disimpan, tetapi murid tidak muncul dalam kehadiran dan ibu bapa tidak dapat melihatnya."
                        : "Aktifkan semula murid ini?"
                    }
                  >
                    <Power className="size-4" /> {student.isActive ? "Nyahaktifkan Murid" : "Aktifkan Semula"}
                  </ConfirmButton>
                </InlineAction>
                <InlineAction action={deleteStudent.bind(null, student.id)} className="w-full items-stretch">
                  <ConfirmButton
                    size="md"
                    className="w-full"
                    message={`PADAM ${student.fullName} secara kekal? Semua kehadiran, markah, keputusan sekolah dan ulasan murid ini akan dipadam dan TIDAK boleh dipulihkan. Jika murid hanya berhenti, gunakan "Nyahaktifkan".`}
                  >
                    <Trash2 className="size-4" /> Padam Kekal
                  </ConfirmButton>
                </InlineAction>
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {tab === "akademik" && (
        <div className="space-y-6">
          <SectionTitle tone="sage" title="Keputusan Ujian Tuisyen" subtitle="Dimasukkan oleh guru" />
          <Card>
            <CardHeader
              title={`${records.tuition.length} keputusan`}
              actions={
                <ButtonLink href="/admin/markah-tuisyen" variant="soft" size="sm">
                  <Plus className="size-4" /> Masukkan Markah
                </ButtonLink>
              }
            />
            <TuitionResultsTable rows={records.tuition} />
          </Card>

          <SectionTitle tone="beige" title="Keputusan Peperiksaan Sekolah" subtitle="Dihantar oleh ibu bapa" />
          {records.school.length === 0 ? (
            <Card>
              <EmptyState title="Belum ada keputusan sekolah dihantar" />
            </Card>
          ) : (
            <div className="space-y-4">
              {records.school.map((e) => (
                <SchoolExamCard
                  key={e.id}
                  exam={e}
                  showSubmittedAt
                  actions={
                    <ButtonLink href={`/admin/keputusan-sekolah/${e.id}`} variant="soft" size="sm" arrow>
                      Semak
                    </ButtonLink>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "kehadiran" && (
        <div className="space-y-6">
          <AttendanceStats summary={records.attendanceSummary} />
          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader title="Ringkasan Bulanan" />
              <MonthlyAttendanceTable months={records.attendanceMonthly} />
            </Card>
            <Card>
              <CardHeader
                title="Sejarah Kehadiran"
                actions={
                  <ButtonLink href="/admin/kehadiran" variant="soft" size="sm">
                    <CalendarCheck className="size-4" /> Ambil Kehadiran
                  </ButtonLink>
                }
              />
              <AttendanceHistoryTable rows={records.attendance} />
            </Card>
          </div>
        </div>
      )}

      {tab === "ulasan" && (
        <Card>
          <CardHeader
            title="Ulasan Guru"
            description="Termasuk draf yang belum diterbitkan."
            actions={
              <ButtonLink href={`/admin/ulasan?murid=${student.id}`} variant="soft" size="sm">
                <Pencil className="size-4" /> Tulis / Urus Ulasan
              </ButtonLink>
            }
          />
          <CardBody>
            <CommentsList comments={records.comments} />
          </CardBody>
        </Card>
      )}

      {tab === "analisis" && <PerformanceAnalysis records={records} />}
    </>
  );
}
