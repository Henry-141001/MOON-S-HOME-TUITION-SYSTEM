import "server-only";
import { prisma } from "@/lib/prisma";

const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validates and stores a student photo (shared by admin and parent uploads).
 * Returns an error message, or null on success. Caller must authorise first.
 */
export async function saveStudentPhoto(studentId: string, file: FormDataEntryValue | null): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return "Sila pilih gambar.";
  if (!PHOTO_TYPES.includes(file.type)) return "Format gambar mesti JPG, PNG atau WEBP.";
  if (file.size > MAX_PHOTO_BYTES) return "Saiz gambar terlalu besar (maksimum 1.5MB).";
  const data = new Uint8Array(await file.arrayBuffer());
  await prisma.studentPhoto.upsert({
    where: { studentId },
    create: { studentId, data, mimeType: file.type },
    update: { data, mimeType: file.type },
  });
  return null;
}

export async function deleteStudentPhoto(studentId: string) {
  await prisma.studentPhoto.deleteMany({ where: { studentId } });
}
