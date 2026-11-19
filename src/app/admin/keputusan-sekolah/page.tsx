import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime } from "@/lib/dates";
import { average, percent } from "@/lib/analytics";
import { SUBMISSION_LABELS, SUBMISSION_STATUSES } from "@/lib/constants";
import { schoolExamTitle } from "@/lib/records";
import { Badge, Card, EmptyState, PageHeader, PercentPill, Select, Table, TabLinks, buttonClass, cn, submissionTone, td, th } from "@/components/ui";
import type { SubmissionStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Keputusan Ujian Sekolah" };

export default async function SchoolResultsPage({ searchParams }: PageProps<"/admin/keputusan-sekolah">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = SUBMISSION_STATUSES.find((s) => s === sp.status) as SubmissionStatus | undefined;
  const studentId = typeof sp.murid === "string" ? sp.murid : "";

  const [exams, counts, students] = await Promise.all([
    prisma.schoolExamination.findMany({
      where: { ...(status ? { status } : {}), ...(studentId ? { studentId } : {}) },
      orderBy: [{ createdAt: "desc" }],
      include: {
        student: { select: { id: true, fullName: true, studentCode: true } },
        submittedBy: { select: { name: true, parentCode: true } },
        results: { select: { marksObtained: true, totalMarks: true } },
      },
    }),
    prisma.schoolExamination.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.student.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((a, c) => a + c._count._all, 0);
  const qs = (s?: string) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (studentId) p.set("murid", studentId);
    const str = p.toString();
    return `/admin/keputusan-sekolah${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Keputusan Ujian Sekolah"
        description="Keputusan peperiksaan sekolah yang dihantar oleh ibu bapa. Semak, luluskan atau minta pembetulan."
      />

      <TabLinks
        items={[
          { href: qs(), label: `Semua (${total})`, active: !status },
          ...SUBMISSION_STATUSES.map((s) => ({ href: qs(s), label: `${SUBMISSION_LABELS[s]} (${countOf(s)})`, active: status === s })),
        ]}
      />

      <Card>
        <form className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          {status && <input type="hidden" name="status" value={status} />}
          <Select name="murid" defaultValue={studentId} className="w-64 py-2" aria-label="Tapis murid">
            <option value="">Semua murid</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.fullName}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonClass("secondary", "sm")}>
            Tapis
          </button>
        </form>
        {exams.length === 0 ? (
          <EmptyState title="Tiada keputusan dalam senarai ini" />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Murid</th>
                <th className={th}>Peperiksaan</th>
                <th className={th}>Subjek</th>
                <th className={th}>Purata</th>
                <th className={th}>Dihantar</th>
                <th className={th}>Status</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {exams.map((e) => (
                <tr key={e.id} className="hover:bg-beige-50/60">
                  <td className={td}>
                    <p className="font-medium">{e.student.fullName}</p>
                    <p className="text-xs text-muted">{e.student.studentCode}</p>
                  </td>
                  <td className={td}>
                    <p>{schoolExamTitle(e.examType, e.examName)}</p>
                    <p className="text-xs text-muted">{formatDate(e.examDate)}</p>
                  </td>
                  <td className={td}>{e.results.length}</td>
                  <td className={td}>
                    <PercentPill value={average(e.results.map((r) => percent(r.marksObtained, r.totalMarks)))} />
                  </td>
                  <td className={cn(td, "text-xs text-ink-soft")}>
                    {formatDateTime(e.createdAt)}
                    <br />
                    {e.submittedBy ? `${e.submittedBy.name}` : "Admin / akaun dipadam"}
                  </td>
                  <td className={td}>
                    <Badge tone={submissionTone[e.status]}>{SUBMISSION_LABELS[e.status]}</Badge>
                  </td>
                  <td className={cn(td, "text-right")}>
                    <Link href={`/admin/keputusan-sekolah/${e.id}`} className="text-sm font-medium text-sage-700 hover:underline">
                      Semak →
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
