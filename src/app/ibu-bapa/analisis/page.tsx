import { getStudentRecords } from "@/lib/records";
import { PageHeader } from "@/components/ui";
import { PerformanceAnalysis } from "@/components/records";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Analisis Prestasi" };

export default async function ParentAnalysisPage({ searchParams }: PageProps<"/ibu-bapa/analisis">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const r = await getStudentRecords(child.id, { audience: "parent" });
  return (
    <>
      <PageHeader
        title="Analisis Prestasi"
        description={`Perkembangan akademik ${child.fullName}. Keputusan tuisyen dan sekolah dipaparkan secara berasingan.`}
      />
      <PerformanceAnalysis records={r} />
    </>
  );
}
