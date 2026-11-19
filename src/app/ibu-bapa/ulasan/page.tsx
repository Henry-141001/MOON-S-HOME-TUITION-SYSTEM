import { getStudentRecords } from "@/lib/records";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { CommentsList, LatestCommentsByCategory } from "@/components/records";
import { getParentView, NoChildLinked } from "../_view";

export const metadata = { title: "Ulasan Guru" };

export default async function ParentCommentsPage({ searchParams }: PageProps<"/ibu-bapa/ulasan">) {
  const { child } = await getParentView(searchParams);
  if (!child) return <NoChildLinked />;
  const r = await getStudentRecords(child.id, { audience: "parent" });

  return (
    <>
      <PageHeader title="Ulasan Guru" description={`Maklum balas guru tentang perkembangan ${child.fullName}.`} />
      <Card>
        <CardHeader title="Ulasan Terkini Mengikut Kategori" />
        <CardBody>
          <LatestCommentsByCategory comments={r.comments} />
        </CardBody>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Semua Ulasan" description="Terbaru dahulu" />
        <CardBody>
          <CommentsList comments={r.comments} />
        </CardBody>
      </Card>
    </>
  );
}
