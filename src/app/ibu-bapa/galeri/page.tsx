import { prisma } from "@/lib/prisma";
import { toISODate } from "@/lib/dates";
import { Card, CardBody, PageHeader } from "@/components/ui";
import { GalleryGrid } from "@/components/gallery";
import { getParentView } from "../_view";

export const metadata = { title: "Galeri Kelas" };

export default async function ParentGalleryPage({ searchParams }: PageProps<"/ibu-bapa/galeri">) {
  await getParentView(searchParams);
  const photos = await prisma.galleryPhoto.findMany({
    orderBy: [{ takenOn: "desc" }, { createdAt: "desc" }],
    select: { id: true, takenOn: true, activity: true },
  });
  return (
    <>
      <PageHeader title="Galeri Kelas" description="Gambar aktiviti di kelas Moons HomeTuition. Tekan gambar untuk melihat saiz penuh." />
      <Card>
        <CardBody>
          <GalleryGrid photos={photos.map((p) => ({ ...p, takenOn: toISODate(p.takenOn) }))} />
        </CardBody>
      </Card>
    </>
  );
}
