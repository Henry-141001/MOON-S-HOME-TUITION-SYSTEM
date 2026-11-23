import { prisma } from "@/lib/prisma";
import { assertParentOwnsStudent, getSession } from "@/lib/session";
import { imageResponse } from "@/lib/images";

// GET /api/ulasan-foto/:commentId — picture attached to a teacher comment.
// Admin / super admin, or the parent of that student once the comment is published.
export async function GET(_request: Request, ctx: RouteContext<"/api/ulasan-foto/[commentId]">) {
  const { commentId } = await ctx.params;
  const session = await getSession();
  if (!session || (session.role === "PARENT" && session.needsSetup)) return new Response("Unauthorized", { status: 401 });

  const photo = await prisma.commentPhoto.findUnique({
    where: { commentId },
    select: { data: true, mimeType: true, comment: { select: { studentId: true, isPublished: true } } },
  });
  if (!photo) return new Response("Not found", { status: 404 });

  if (session.role === "PARENT") {
    if (!photo.comment.isPublished) return new Response("Not found", { status: 404 });
    try {
      await assertParentOwnsStudent(session.parent.id, photo.comment.studentId);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }
  return imageResponse(photo.data, photo.mimeType);
}
