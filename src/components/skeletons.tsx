// Placeholder shapes shown instantly while a page's data loads (used by loading.tsx files).
import { cn } from "@/components/ui";

function Bone({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-beige-100", className)} />;
}

function CardBones({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)]", className)}>
      <Bone className="h-4 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Bone key={i} className={cn("h-9", i % 2 ? "w-11/12" : "w-full")} />
        ))}
      </div>
    </div>
  );
}

/** Full page: title, stat cards and content cards. */
export function PageSkeleton({ stats = true }: { stats?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Memuatkan halaman">
      <span className="sr-only">Memuatkan…</span>
      <div className="mb-6 space-y-2">
        <Bone className="h-8 w-64 max-w-full" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
              <Bone className="h-3.5 w-24" />
              <Bone className="mt-3 h-7 w-16" />
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <CardBones rows={5} />
        <CardBones rows={5} />
      </div>
    </div>
  );
}

/** Content only (for sections whose header/tabs stay on screen). */
export function SectionSkeleton() {
  return (
    <div role="status" aria-live="polite" aria-label="Memuatkan">
      <span className="sr-only">Memuatkan…</span>
      <CardBones rows={6} />
    </div>
  );
}
