"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { useReadOnly } from "@/components/forms";
import { initialState, type ActionState } from "@/lib/action-state";

const MAX_SIDE = 600;

/** Resize to max 600px and re-encode as JPEG in the browser, so uploads stay small. */
async function resizeImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("resize failed");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function PhotoUploader({
  upload,
  remove,
  hasPhoto,
}: {
  upload: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  remove: () => Promise<ActionState>;
  hasPhoto: boolean;
}) {
  const [state, action, pending] = useActionState(upload, initialState);
  const [removeState, setRemoveState] = useState<ActionState>(initialState);
  const [removing, startRemove] = useTransition();
  const [clientError, setClientError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startUpload] = useTransition();
  const readOnly = useReadOnly();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setClientError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setClientError("Sila pilih fail gambar.");
    try {
      const resized = await resizeImage(file);
      const fd = new FormData();
      fd.set("photo", resized);
      startUpload(() => action(fd));
    } catch {
      setClientError("Gambar tidak dapat diproses. Cuba gambar lain (JPG/PNG).");
    }
  }

  const message = clientError ?? (state.status === "error" ? state.message : removeState.status === "error" ? removeState.message : null);

  if (readOnly) return null;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap gap-2">
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
        <button type="button" className={buttonClass("secondary", "sm")} onClick={() => inputRef.current?.click()} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
          {hasPhoto ? "Tukar Gambar" : "Muat Naik Gambar"}
        </button>
        {hasPhoto && (
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            disabled={removing}
            onClick={() => {
              if (!window.confirm("Buang gambar murid ini?")) return;
              startRemove(async () => setRemoveState(await remove()));
            }}
          >
            <Trash2 className="size-4" /> Buang
          </button>
        )}
      </div>
      {message && <p className="text-xs text-rose-ink">{message}</p>}
    </div>
  );
}
