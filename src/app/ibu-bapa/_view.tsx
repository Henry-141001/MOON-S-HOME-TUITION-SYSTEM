import "server-only";
import { requireParentView, resolveParentChild } from "@/lib/session";
import { Card, EmptyState } from "@/components/ui";

/**
 * Resolves the parent and the child being viewed (?m=<studentId>).
 * resolveParentChild only ever returns one of this parent's own children,
 * so a tampered ?m= value silently falls back to their first child.
 */
export async function getParentView(searchParams: Promise<Record<string, string | string[] | undefined>>) {
  const { parent, readOnly } = await requireParentView();
  const sp = await searchParams;
  const requested = typeof sp.m === "string" ? sp.m : null;
  const { children, current } = await resolveParentChild(parent.id, requested);
  return { parent, children, child: current, readOnly };
}

export function NoChildLinked() {
  return (
    <Card>
      <EmptyState
        title="Tiada murid dipautkan kepada ID ini"
        description="Sila hubungi guru tuisyen untuk memautkan akaun anda kepada profil anak anda."
      />
    </Card>
  );
}

/** Adds ?m= so links keep the selected child. */
export function withChild(href: string, childId: string) {
  return `${href}${href.includes("?") ? "&" : "?"}m=${childId}`;
}
