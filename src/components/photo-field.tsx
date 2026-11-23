"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { resizeImage } from "@/lib/resize-image";

/**
 * Optional picture for a form (e.g. a teacher comment). The chosen picture is
 * shrunk in the browser and put back into the same file input, so the form
 * submits the small version.
 */
export function PhotoField({
  name = "photo",
  maxSide = 1280,
  existingUrl,
}: {
  name?: string;
  maxSide?: number;
  /** Current picture (edit forms): shown with a "remove" tick box. */
  existingUrl?: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When the form is cleared after saving, clear the preview too.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      setPreview(null);
      setError(null);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return setPreview(null);
    if (!file.type.startsWith("image/")) {
      input.value = "";
      setPreview(null);
      return setError("Sila pilih fail gambar.");
    }
    try {
      const small = await resizeImage(file, maxSide, 0.82);
      const dt = new DataTransfer();
      dt.items.add(small);
      input.files = dt.files;
      setPreview(URL.createObjectURL(small));
    } catch {
      input.value = "";
      setPreview(null);
      setError("Gambar tidak dapat diproses. Cuba gambar lain (JPG/PNG).");
    }
  }

  const shown = preview ?? existingUrl ?? null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-ink-soft">Gambar (pilihan)</span>
      <div className="flex flex-wrap items-center gap-3">
        {shown && (
          // eslint-disable-next-line @next/next/no-img-element -- local preview or private picture
          <img src={shown} alt="Pratonton gambar" className="size-20 rounded-xl object-cover ring-1 ring-line" />
        )}
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-beige-300 bg-surface px-4 py-2 text-sm font-medium text-ink shadow-sm hover:bg-beige-50">
          <ImagePlus className="size-4" />
          {shown ? "Tukar gambar" : "Tambah gambar"}
          <input ref={inputRef} type="file" name={name} accept="image/*" className="sr-only" onChange={onChange} />
        </label>
        {existingUrl && !preview && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" name="removePhoto" className="size-4 accent-rose-ink" /> Buang gambar
          </label>
        )}
      </div>
      {error && <p className="text-xs text-rose-ink">{error}</p>}
    </div>
  );
}
