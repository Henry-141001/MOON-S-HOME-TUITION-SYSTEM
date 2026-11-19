import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { MoonMark } from "@/components/ui";
import { LoginPanel } from "./login-panel";

export const metadata = { title: "Log Masuk" };

const TAGLINE = "Memantau perkembangan anak anda, dengan mudah.";

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const session = await getSession();
  if (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") redirect("/admin");
  if (session?.role === "PARENT") redirect("/ibu-bapa");

  const { peranan } = await searchParams;
  const initialTab = peranan === "admin" ? "admin" : "parent";

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Desktop brand panel */}
      <section className="relative hidden overflow-hidden bg-sage-700 p-12 text-beige-50 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-sage-600/60" />
        <div className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-sage-800/50" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-beige-50/15">
            <MoonMark className="size-7 text-beige-50" />
          </span>
          <p className="font-display text-lg font-semibold tracking-wide">MOON&apos;S HOME TUITION</p>
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl font-semibold leading-tight">{TAGLINE}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-beige-100/85">
            Kehadiran, markah ujian tuisyen, keputusan peperiksaan sekolah dan ulasan guru, semuanya di satu tempat.
          </p>
        </div>
        <p className="relative text-xs text-beige-100/60">© {new Date().getFullYear()} Moon&apos;s Home Tuition</p>
      </section>

      {/* Phone / tablet header: same brand panel, as a band across the top */}
      <header className="relative overflow-hidden bg-sage-700 px-6 pb-16 pt-[max(3rem,env(safe-area-inset-top))] text-center text-beige-50 lg:hidden">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-sage-600/60" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 size-60 rounded-full bg-sage-800/50" aria-hidden="true" />
        <div className="relative">
          <span className="mx-auto grid size-16 place-items-center rounded-[1.25rem] bg-beige-50/15 ring-1 ring-beige-50/20">
            <MoonMark className="size-9 text-beige-50" />
          </span>
          <p className="mt-4 font-display text-xl font-semibold tracking-wide">MOON&apos;S HOME TUITION</p>
          <p className="mx-auto mt-1.5 max-w-xs text-balance text-sm leading-relaxed text-beige-100/85">{TAGLINE}</p>
        </div>
      </header>

      {/* Login panel — on phones a cream sheet that overlaps the green band */}
      <section className="relative -mt-8 flex justify-center rounded-t-[2rem] bg-cream px-5 pb-10 pt-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none lg:py-10">
        <div className="w-full max-w-md">
          <h2 className="font-display text-[28px] font-semibold text-ink sm:text-3xl">Selamat datang</h2>
          <p className="mt-1 text-sm text-muted">Sila pilih jenis log masuk anda.</p>
          <LoginPanel initialTab={initialTab} />
          <p className="mt-8 text-center text-xs text-muted lg:hidden">© {new Date().getFullYear()} Moon&apos;s Home Tuition</p>
        </div>
      </section>
    </div>
  );
}
