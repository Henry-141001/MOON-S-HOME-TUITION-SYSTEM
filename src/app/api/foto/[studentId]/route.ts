import { prisma } from "@/lib/prisma";
import { assertParentOwnsStudent, getSession } from "@/lib/session";

// GET /api/foto/:studentId — student photo, only for the admin or that student's own parent.
export async function GET(_request: Request, ctx: RouteContext<"/api/foto/[studentId]">) {
  const { studentId } = await ctx.params;
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  if (session.role === "PARENT") {
    try {
      await assertParentOwnsStudent(session.parent.id, studentId);
    } catch {
      return new Response("Not found", { status: 404 });
    }
  }

  const photo = await prisma.studentPhoto.findUnique({ where: { studentId } });
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(Buffer.from(photo.data), {
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
