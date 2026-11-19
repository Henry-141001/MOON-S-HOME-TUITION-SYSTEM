import "server-only";
import { prisma } from "@/lib/prisma";
import { randomCode } from "@/lib/security";

/** Next sequential Student ID, e.g. STU011. Student IDs are not secret. */
export async function nextStudentCode(): Promise<string> {
  const rows = await prisma.student.findMany({ where: { studentCode: { startsWith: "STU" } }, select: { studentCode: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.studentCode.replace(/\D/g, "")) || 0), 0);
  return `STU${String(max + 1).padStart(3, "0")}`;
}

/**
 * New Parent ID, e.g. MHT004-K7QX. The family number keeps it readable and the
 * random 4-character suffix makes it hard to guess (Parent IDs act as the key).
 */
export async function generateParentCode(): Promise<string> {
  const rows = await prisma.parent.findMany({ where: { parentCode: { startsWith: "MHT" } }, select: { parentCode: true } });
  const max = rows.reduce((m, r) => Math.max(m, Number(r.parentCode.slice(3).split("-")[0]) || 0), 0);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `MHT${String(max + 1).padStart(3, "0")}-${randomCode(4)}`;
    const taken = await prisma.parent.findUnique({ where: { parentCode: code }, select: { id: true } });
    if (!taken) return code;
  }
  throw new Error("Could not generate a unique Parent ID");
}

/** Keep the family number but replace the random part (used when an ID may have leaked). */
export async function regenerateParentCode(current: string): Promise<string> {
  const prefix = /^MHT\d{3,}/.exec(current)?.[0];
  if (!prefix) return generateParentCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `${prefix}-${randomCode(4)}`;
    const taken = await prisma.parent.findUnique({ where: { parentCode: code }, select: { id: true } });
    if (!taken && code !== current) return code;
  }
  return generateParentCode();
}
