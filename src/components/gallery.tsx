// Class gallery grid, shared by the admin page and the parent portal (server-rendered).
import Image from "next/image";
import type { ReactNode } from "react";
import { formatLongDate } from "@/lib/dates";
import { EmptyState } from "@/components/ui";

export type GalleryItem = { id: string; takenOn: string; activity: string };

/** Photos grouped by date (newest first). Tap a photo to open it full size. */
export function GalleryGrid({
  photos,
  renderActions,
  emptyText = "Belum ada gambar aktiviti kelas.",
}: {
  photos: GalleryItem[];
  renderActions?: (photo: GalleryItem) => ReactNode;
  emptyText?: string;
}) {
  if (photos.length === 0) return <EmptyState title={emptyText} />;
  const groups = new Map<string, GalleryItem[]>();
  for (const p of photos) groups.set(p.takenOn, [...(groups.get(p.takenOn) ?? []), p]);

  return (
    <div className="space-y-6">
      {[...groups.entries()].map(([date, items]) => (
        <section key={date}>
          <h3 className="mb-2.5 text-sm font-semibold text-ink">{formatLongDate(date)}</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl border border-line bg-surface">
                <a href={`/api/galeri/${p.id}`} target="_blank" rel="noopener" className="block bg-beige-100">
                  <Image
                    src={`/api/galeri/${p.id}`}
                    alt={p.activity}
                    width={400}
                    height={300}
                    unoptimized
                    loading="lazy"
                    className="aspect-[4/3] h-auto w-full object-cover"
                  />
                </a>
                <div className="px-3 py-2">
                  <p className="text-sm font-medium leading-snug text-ink">{p.activity}</p>
                  <p className="text-xs text-muted">{formatLongDate(p.takenOn)}</p>
                  {renderActions && <div className="mt-1.5 flex justify-end">{renderActions(p)}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
