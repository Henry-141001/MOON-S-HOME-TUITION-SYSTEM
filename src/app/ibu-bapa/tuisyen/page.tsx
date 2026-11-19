import { getStudentRecords } from "@/lib/records";
import { formatShortDate } from "@/lib/dates";
import { timelineBySubject } from "@/lib/analytics";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { TrendLineChart } from "@/components/charts";
import { SubjectPerformanceTable, TuitionResultsTable } from "@/components/records";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Pencapaian Tuisyen" };

export default async function ParentTuitionPage({ searchParams }: PageProps<"/ibu-bapa/tuisyen">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const r = await getStudentRecords(child.id, { audience: "parent" });
  const timeline = timelineBySubject(r.tuitionScoreRows, formatShortDate);

  return (
    <>
      <PageHeader
        title="Pencapaian Tuisyen"
        description={`Markah ujian tuisyen ${child.fullName}. Markah ini dimasukkan oleh guru tuisyen.`}
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perkembangan Markah" description="Peratus mengikut tarikh ujian" />
          <CardBody>
            <TrendLineChart points={timeline.points} series={timeline.subjects} emptyText="Belum ada markah ujian tuisyen." />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title="Prestasi Mengikut Subjek"
            description={r.tuitionOverall === null ? undefined : `Purata keseluruhan: ${r.tuitionOverall}%`}
          />
          <SubjectPerformanceTable rows={r.tuitionBySubject} emptyText="Belum ada markah ujian tuisyen" />
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader title="Semua Keputusan Ujian Tuisyen" description={`${r.tuition.length} keputusan`} />
        <TuitionResultsTable rows={r.tuition} />
      </Card>
    </>
  );
}
