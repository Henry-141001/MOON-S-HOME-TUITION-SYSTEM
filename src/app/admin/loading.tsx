import { PageSkeleton } from "@/components/skeletons";

// Shown instantly when moving between admin pages while the new page's data loads.
export default function Loading() {
  return <PageSkeleton />;
}
