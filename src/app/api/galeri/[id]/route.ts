import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { imageResponse } from "@/lib/images";

// GET /api/galeri/:id — class gallery photo. Registered parents (who finished the
// first-login steps), the admin and the super admin only.
export async function GET(_request: Request, ctx: RouteContext<"/api/galeri/[id]">) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || (session.role === "PARENT" && session.needsSetup)) return new Response("Unauthorized", { status: 401 });
  const photo = await prisma.galleryPhoto.findUnique({ where: { id }, select: { data: true, mimeType: true } });
  if (!photo) return new Response("Not found", { status: 404 });
  // Each id is one picture that never changes, so browsers may keep it for a week.
  return imageResponse(photo.data, photo.mimeType, 604800);
}
