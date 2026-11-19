"use client";

import Link from "next/link";
import { buttonClass, MoonMark } from "@/components/ui";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="max-w-md text-center">
        <MoonMark className="mx-auto size-12 text-beige-300" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Maaf, ada ralat berlaku</h1>
        <p className="mt-2 text-sm text-muted">Sila cuba sekali lagi. Jika masalah berterusan, hubungi guru tuisyen.</p>
        <div className="mt-6 flex justify-center gap-2">
          <button type="button" onClick={reset} className={buttonClass("primary")}>
            Cuba Lagi
          </button>
          <Link href="/" className={buttonClass("secondary")}>
            Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
}
