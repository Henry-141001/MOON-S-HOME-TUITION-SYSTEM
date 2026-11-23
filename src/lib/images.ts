import "server-only";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Checks an uploaded picture and returns its bytes, or an error message in Malay.
 * Pictures are resized in the browser first, so real uploads are far below the limit.
 */
export async function readUploadedImage(
  file: FormDataEntryValue | null,
  maxBytes = 1.8 * 1024 * 1024,
): Promise<{ data: Uint8Array<ArrayBuffer>; mimeType: string } | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return { error: "Sila pilih gambar." };
  if (!IMAGE_TYPES.includes(file.type)) return { error: "Format gambar mesti JPG, PNG atau WEBP." };
  if (file.size > maxBytes) return { error: `Saiz gambar terlalu besar (maksimum ${(maxBytes / 1024 / 1024).toFixed(1)}MB).` };
  return { data: new Uint8Array(await file.arrayBuffer()), mimeType: file.type };
}

/** Response for a stored picture (private: only logged-in, authorised users reach it). */
export function imageResponse(data: Uint8Array, mimeType: string, maxAge = 86400) {
  return new Response(Buffer.from(data), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": `private, max-age=${maxAge}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
