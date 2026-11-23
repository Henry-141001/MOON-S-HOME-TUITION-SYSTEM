/**
 * Browser-side: shrink a photo to at most `maxSide` px and re-encode as JPEG,
 * so uploads from phones stay small (and well under the server's size limit).
 */
export async function resizeImage(file: File, maxSide: number, quality = 0.85): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("resize failed");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
