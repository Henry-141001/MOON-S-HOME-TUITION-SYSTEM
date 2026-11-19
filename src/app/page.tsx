import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { BrandLogo, MoonMark } from "@/components/ui";
import { LoginPanel } from "./login-panel";

export const metadata = { title: "Log Masuk" };

export default async function LoginPage({ searchParams }: PageProps<"/">) {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");
  if (session?.role === "PARENT") redirect("/ibu-bapa");

  const { peranan } = await searchParams;
  const initialTab = peranan === "admin" ? "admin" : "parent";

  return (
    <div className="relative grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
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
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Memantau perkembangan anak anda, dengan mudah.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-beige-100/85">
            Kehadiran, markah ujian tuisyen, keputusan peperiksaan sekolah dan ulasan guru, semuanya di satu tempat.
          </p>
        </div>
        <p className="relative text-xs text-beige-100/60">© {new Date().getFullYear()} Moon&apos;s Home Tuition</p>
      </section>

      {/* Login panel */}
      <section className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo subtitle="Sistem Pengurusan Tuisyen" />
          </div>
          <h2 className="font-display text-3xl font-semibold text-ink">Selamat datang</h2>
          <p className="mt-1.5 text-sm text-muted">Sila pilih jenis log masuk anda.</p>
          <LoginPanel initialTab={initialTab} />
        </div>
      </section>
    </div>
  );
}
