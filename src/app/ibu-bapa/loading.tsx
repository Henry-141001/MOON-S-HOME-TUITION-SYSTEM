import { PageSkeleton } from "@/components/skeletons";

// Shown instantly when moving between parent pages while the new page's data loads.
export default function Loading() {
  return <PageSkeleton />;
}
