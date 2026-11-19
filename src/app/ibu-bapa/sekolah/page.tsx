import { Lock, Send } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStudentRecords } from "@/lib/records";
import { todayISO } from "@/lib/dates";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { ConfirmButton, InlineAction, Modal } from "@/components/forms";
import { SchoolExamCard } from "@/components/records";
import { SchoolExamForm } from "@/components/school-exam-form";
import { deleteOwnSchoolExam, submitSchoolExam, updateOwnSchoolExam } from "../_actions";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Keputusan Ujian Sekolah" };

export default async function ParentSchoolPage({ searchParams }: PageProps<"/ibu-bapa/sekolah">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const [r, subjects] = await Promise.all([
    getStudentRecords(child.id, { audience: "parent" }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const today = todayISO();
  const needsFix = r.school.filter((e) => e.status === "NEEDS_CORRECTION").length;

  return (
    <>
      <PageHeader
        title="Keputusan Ujian Sekolah"
        description={`Hantar dan semak keputusan peperiksaan sekolah ${child.fullName}.`}
      />

      {needsFix > 0 && (
        <div className="mb-5 rounded-2xl border border-rose-soft bg-rose-soft/60 px-4 py-3 text-sm text-rose-ink">
          Guru meminta pembetulan untuk <strong>{needsFix}</strong> keputusan. Sila lihat catatan guru di bawah dan tekan
          &ldquo;Betulkan&rdquo;.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <Card className="h-fit">
          <CardHeader title="Hantar Keputusan Baharu" icon={<Send className="size-4" />} />
          <CardBody>
            <SchoolExamForm
              key={child.id}
              action={submitSchoolExam.bind(null, child.id)}
              subjects={subjects}
              maxDate={today}
              defaults={{ examDate: today }}
              submitLabel="Hantar Keputusan"
              clearAfterSubmit
            />
          </CardBody>
        </Card>

        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink">Keputusan yang Telah Dihantar</h2>
          {r.school.length === 0 ? (
            <Card>
              <EmptyState title="Belum ada keputusan dihantar" />
            </Card>
          ) : (
            r.school.map((e) => (
              <SchoolExamCard
                key={e.id}
                exam={e}
                showSubmittedAt
                actions={
                  e.status === "APPROVED" ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                      <Lock className="size-3.5" /> Telah disahkan guru
                    </span>
                  ) : (
                    <>
                      <Modal
                        trigger={e.status === "NEEDS_CORRECTION" ? "Betulkan" : "Edit"}
                        triggerVariant={e.status === "NEEDS_CORRECTION" ? "primary" : "secondary"}
                        triggerSize="sm"
                        title="Kemas Kini Keputusan"
                        description="Selepas dikemas kini, keputusan akan disemak semula oleh guru."
                        wide
                      >
                        <SchoolExamForm
                          action={updateOwnSchoolExam.bind(null, e.id)}
                          subjects={subjects}
                          maxDate={today}
                          defaults={{
                            examType: e.examType,
                            examName: e.examName,
                            examDate: e.date,
                            remarks: e.remarks,
                            rows: e.results.map((x) => ({ subjectId: x.subjectId, marks: x.marks, total: x.total })),
                          }}
                          submitLabel="Simpan & Hantar Semula"
                        />
                      </Modal>
                      <InlineAction action={deleteOwnSchoolExam.bind(null, e.id)}>
                        <ConfirmButton message="Padam keputusan ini? Tindakan ini tidak boleh dibatalkan.">Padam</ConfirmButton>
                      </InlineAction>
                    </>
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}
