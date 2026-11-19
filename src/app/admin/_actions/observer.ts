"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/session";
import { logActivity } from "@/lib/activity";

/**
 * Super admin only: open one parent's portal in read-only mode.
 * This changes nothing except the super admin's own session.
 */
export async function observeParent(parentId: string) {
  const session = await requireSuperAdmin();
  const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { id: true, name: true, parentCode: true } });
  if (!parent) redirect("/admin/ibu-bapa");
  await prisma.session.update({ where: { id: session.sessionId }, data: { observeParentId: parent.id } });
  await logActivity(
    { role: "SUPER_ADMIN", id: session.superAdmin.id, name: session.superAdmin.name },
    "observe.parent",
    `Melihat portal ibu bapa ${parent.name} (${parent.parentCode})`,
  );
  redirect("/ibu-bapa");
}

export async function stopObservingParent() {
  const session = await requireSuperAdmin();
  await prisma.session.update({ where: { id: session.sessionId }, data: { observeParentId: null } });
  redirect("/admin/ibu-bapa");
}
