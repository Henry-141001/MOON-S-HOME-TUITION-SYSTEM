import { getStudentRecords } from "@/lib/records";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { AttendanceHistoryTable, AttendanceStats, MonthlyAttendanceTable } from "@/components/records";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Rekod Kehadiran" };

export default async function ParentAttendancePage({ searchParams }: PageProps<"/ibu-bapa/kehadiran">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const r = await getStudentRecords(child.id, { audience: "parent" });

  return (
    <>
      <PageHeader title="Rekod Kehadiran" description={`Kehadiran ${child.fullName} di kelas tuisyen.`} />
      <AttendanceStats summary={r.attendanceSummary} />
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Ringkasan Bulanan" />
          <MonthlyAttendanceTable months={r.attendanceMonthly} />
        </Card>
        <Card>
          <CardHeader title="Sejarah Kehadiran" description="Direkodkan oleh guru tuisyen" />
          <AttendanceHistoryTable rows={r.attendance} />
        </Card>
      </div>
    </>
  );
}
