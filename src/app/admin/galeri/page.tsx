import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { todayISO, toISODate } from "@/lib/dates";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmButton, InlineAction } from "@/components/forms";
import { GalleryGrid } from "@/components/gallery";
import { GalleryUploader } from "@/components/gallery-uploader";
import { deleteGalleryPhoto, uploadGalleryPhoto } from "@/app/admin/_actions/gallery";

export const metadata = { title: "Galeri Kelas" };

export default async function AdminGalleryPage() {
  const viewer = await requireAdminView();
  const photos = await prisma.galleryPhoto.findMany({
    orderBy: [{ takenOn: "desc" }, { createdAt: "desc" }],
    select: { id: true, takenOn: true, activity: true },
  });

  return (
    <>
      <PageHeader title="Galeri Kelas" description="Gambar aktiviti kelas. Hanya ibu bapa yang berdaftar boleh melihat galeri ini." />
      {!viewer.readOnly && (
        <Card className="mb-6">
          <CardHeader title="Muat Naik Gambar" description="Kapsyen: tarikh dan aktiviti. Gambar dikecilkan secara automatik." />
          <CardBody>
            <GalleryUploader upload={uploadGalleryPhoto} defaultDate={todayISO()} />
          </CardBody>
        </Card>
      )}
      <Card>
        <CardHeader title="Semua Gambar" description={`${photos.length} gambar · terbaru dahulu`} />
        <CardBody>
          <GalleryGrid
            photos={photos.map((p) => ({ ...p, takenOn: toISODate(p.takenOn) }))}
            renderActions={(p) => (
              <InlineAction action={deleteGalleryPhoto.bind(null, p.id)}>
                <ConfirmButton variant="ghost" size="xs" message="Padam gambar ini daripada galeri?">
                  Padam
                </ConfirmButton>
              </InlineAction>
            )}
          />
        </CardBody>
      </Card>
    </>
  );
}
