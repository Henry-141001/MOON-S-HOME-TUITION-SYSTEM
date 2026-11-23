"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2 } from "lucide-react";
import { useReadOnly } from "@/components/forms";
import { buttonClass, Input } from "@/components/ui";
import { initialState, type ActionState } from "@/lib/action-state";
import { resizeImage } from "@/lib/resize-image";

const MAX_SIDE = 1600;
const MAX_FILES = 20;

/**
 * Pick one or more photos, add Date + Activity, upload. Each photo is resized in the
 * browser and sent on its own, so many photos never hit the upload size limit.
 */
export function GalleryUploader({
  upload,
  defaultDate,
}: {
  upload: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaultDate: string;
}) {
  const router = useRouter();
  const readOnly = useReadOnly();
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  if (readOnly) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = e.currentTarget;
    const takenOn = String(new FormData(form).get("takenOn") ?? "");
    const activity = String(new FormData(form).get("activity") ?? "").trim();
    if (!takenOn) return setMessage({ ok: false, text: "Sila pilih tarikh." });
    if (!activity) return setMessage({ ok: false, text: "Sila tulis aktiviti (cth. Kelas Matematik — latihan pecahan)." });
    if (files.length === 0) return setMessage({ ok: false, text: "Sila pilih sekurang-kurangnya satu gambar." });

    setMessage(null);
    let done = 0;
    const failed: string[] = [];
    setBusy({ done, total: files.length });
    for (const file of files) {
      try {
        const fd = new FormData();
        fd.set("takenOn", takenOn);
        fd.set("activity", activity);
        fd.set("photo", await resizeImage(file, MAX_SIDE, 0.82));
        const res = await upload(initialState, fd);
        if (res.status === "error") failed.push(`${file.name}: ${res.message}`);
      } catch {
        failed.push(`${file.name}: gambar tidak dapat diproses.`);
      }
      done++;
      setBusy({ done, total: files.length });
    }
    setBusy(null);
    const okCount = files.length - failed.length;
    setFiles([]);
    if (fileRef.current) fileRef.current.value = "";
    setMessage(
      failed.length === 0
        ? { ok: true, text: `${okCount} gambar telah dimuat naik ke galeri.` }
        : { ok: false, text: `${okCount} berjaya, ${failed.length} gagal. ${failed.slice(0, 3).join(" ")}` },
    );
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="takenOn" className="text-[13px] font-medium text-ink-soft">
            Tarikh<span className="ml-0.5 text-rose-ink">*</span>
          </label>
          <Input id="takenOn" name="takenOn" type="date" defaultValue={defaultDate} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="activity" className="text-[13px] font-medium text-ink-soft">
            Aktiviti<span className="ml-0.5 text-rose-ink">*</span>
          </label>
          <Input id="activity" name="activity" maxLength={120} placeholder="cth. Kelas Sains — eksperimen tumbuhan" required />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
            setFiles(picked.slice(0, MAX_FILES));
            setMessage(picked.length > MAX_FILES ? { ok: false, text: `Maksimum ${MAX_FILES} gambar sekali muat naik.` } : null);
          }}
        />
        <button type="button" className={buttonClass("secondary")} onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
          <ImagePlus className="size-4" /> {files.length ? "Tukar Pilihan Gambar" : "Pilih Gambar"}
        </button>
        <span className="text-sm text-muted">{files.length ? `${files.length} gambar dipilih` : "Boleh pilih beberapa gambar sekaligus."}</span>
      </div>

      {message && (
        <div
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "flex items-start gap-2 rounded-xl bg-success-soft px-3.5 py-2.5 text-sm text-success-ink"
              : "flex items-start gap-2 rounded-xl bg-rose-soft px-3.5 py-2.5 text-sm text-rose-ink"
          }
        >
          {message.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" className={buttonClass("primary")} disabled={Boolean(busy)}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Memuat naik {busy.done}/{busy.total}…
            </>
          ) : (
            "Muat Naik ke Galeri"
          )}
        </button>
      </div>
    </form>
  );
}
