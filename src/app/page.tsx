import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BrandMark } from "@/components/ui";
import { BRAND_TAGLINE } from "@/lib/constants";
import { LoginPanel } from "./login-panel";

export const metadata = { title: "Log Masuk" };

const HEADLINE = "Memantau perkembangan anak anda, dengan mudah.";

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const session = await getSession();
  if (session?.role === "ADMIN" || session?.role === "SUPER_ADMIN") redirect("/admin");
  if (session?.role === "PARENT") redirect("/ibu-bapa");

  const { peranan } = await searchParams;
  const initialTab = peranan === "admin" ? "admin" : "parent";
  const year = new Date().getFullYear();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Desktop brand panel */}
      <section className="relative hidden overflow-hidden bg-sage-700 p-12 text-beige-50 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-sage-600/60" />
        <div className="absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-sage-800/50" />
        <div className="relative flex items-center gap-3">
          <BrandMark size={52} priority className="ring-2 ring-beige-50/30" />
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold tracking-wide">MOONS HOME TUTOR</p>
            <p className="text-xs tracking-wide text-beige-100/75">{BRAND_TAGLINE}</p>
          </div>
        </div>
        <div className="relative max-w-md">
          <BrandMark size={150} className="mb-8 ring-4 ring-beige-50/20" />
          <h1 className="font-display text-4xl font-semibold leading-tight">{HEADLINE}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-beige-100/85">
            Kehadiran, markah ujian tuisyen, keputusan peperiksaan sekolah dan ulasan guru, semuanya di satu tempat.
          </p>
        </div>
        <p className="relative text-xs text-beige-100/60">© {year} Moons Home Tutor</p>
      </section>

      {/* Phone / tablet header: the round badge on a green band */}
      <header className="relative overflow-hidden bg-sage-700 px-6 pb-16 pt-[max(2.5rem,env(safe-area-inset-top))] text-center text-beige-50 lg:hidden">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-sage-600/60" aria-hidden="true" />
        <div className="absolute -bottom-24 -left-16 size-60 rounded-full bg-sage-800/50" aria-hidden="true" />
        <div className="relative">
          <BrandMark size={116} priority className="mx-auto ring-4 ring-beige-50/25" />
          <p className="mt-4 font-display text-xl font-semibold tracking-wide">MOONS HOME TUTOR</p>
          <p className="mt-1 text-sm tracking-wide text-beige-100/85">{BRAND_TAGLINE}</p>
        </div>
      </header>

      {/* Login panel — on phones a cream sheet that overlaps the green band */}
      <section className="relative -mt-8 flex justify-center rounded-t-[2rem] bg-cream px-5 pb-10 pt-8 sm:px-8 lg:mt-0 lg:items-center lg:rounded-none lg:py-10">
        <div className="w-full max-w-md">
          <h2 className="font-display text-[28px] font-semibold text-ink sm:text-3xl">Selamat datang</h2>
          <p className="mt-1 text-sm text-muted">Sila pilih jenis log masuk anda.</p>
          <LoginPanel initialTab={initialTab} />
          <p className="mt-8 text-center text-xs text-muted lg:hidden">© {year} Moons Home Tutor</p>
        </div>
      </section>
    </div>
  );
}
