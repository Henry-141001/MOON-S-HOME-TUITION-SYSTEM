import Link from "next/link";
import { buttonClass, MoonMark } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <MoonMark className="mx-auto size-12 text-beige-300" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink">Halaman tidak dijumpai</h1>
        <p className="mt-2 text-sm text-muted">Rekod ini mungkin telah dipadam atau pautan tidak betul.</p>
        <Link href="/" className={`${buttonClass("primary")} mt-6`}>
          Kembali ke Halaman Utama
        </Link>
      </div>
    </div>
  );
}
