import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/session";
import { buildStudentReport } from "@/lib/report";
import { ReportDocument } from "@/lib/report-pdf";
import { todayISO } from "@/lib/dates";

// GET /api/laporan/:studentId — downloads the student's report as a PDF (admin only).
export async function GET(_request: Request, ctx: RouteContext<"/api/laporan/[studentId]">) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return new Response("Unauthorized", { status: 401 });

  const { studentId } = await ctx.params;
  const report = await buildStudentReport(studentId);
  if (!report) return new Response("Not found", { status: 404 });

  const pdf = await renderToBuffer(ReportDocument({ r: report }));
  const safeName = report.student.name.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "") || "murid";
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Laporan_${safeName}_${todayISO()}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
