"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { fail, handleError, isoDate, ok, parse, text } from "@/lib/action";
import { formatDate, parseISODate } from "@/lib/dates";
import { readUploadedImage } from "@/lib/images";
import { adminActor, logActivity } from "@/lib/activity";
import type { ActionState } from "@/lib/action-state";

const captionSchema = z.object({
  takenOn: isoDate("Tarikh"),
  activity: text("Aktiviti", 120),
});

/** Adds ONE class photo (the uploader sends several pictures one by one). */
export async function uploadGalleryPhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = parse(captionSchema, { takenOn: formData.get("takenOn"), activity: formData.get("activity") });
  if (parsed.error) return parsed.error;
  const image = await readUploadedImage(formData.get("photo"));
  if ("error" in image) return fail(image.error);
  try {
    await prisma.galleryPhoto.create({
      data: { takenOn: parseISODate(parsed.data.takenOn), activity: parsed.data.activity, ...image, createdById: admin.id },
    });
    await logActivity(adminActor(admin), "gallery.upload", `Memuat naik gambar galeri "${parsed.data.activity}" (${formatDate(parsed.data.takenOn)})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar telah dimuat naik.");
}

export async function deleteGalleryPhoto(photoId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  try {
    const p = await prisma.galleryPhoto.delete({ where: { id: photoId }, select: { activity: true, takenOn: true } });
    await logActivity(adminActor(admin), "gallery.delete", `Memadam gambar galeri "${p.activity}" (${formatDate(p.takenOn)})`);
  } catch (e) {
    return handleError(e);
  }
  revalidatePath("/", "layout");
  return ok("Gambar telah dipadam.");
}
