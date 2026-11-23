import { KeyRound, School, ShieldAlert, Trash2, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { Card, CardBody, CardHeader, Input, PageHeader, Textarea } from "@/components/ui";
import { ActionForm, Field, SubmitButton } from "@/components/forms";
import { changePassword, deleteDemoData, updateAdminProfile, updateCentreSettings } from "@/app/admin/_actions/settings";

export const metadata = { title: "Tetapan" };

export default async function SettingsPage() {
  const admin = await requireAdminView();
  if (admin.readOnly) redirect("/admin"); // the observer has nothing to manage here
  const [settings, demoStudents, demoParents, parentsWithoutPin, totalParents] = await Promise.all([
    prisma.appSetting.findUnique({ where: { id: 1 } }),
    prisma.student.count({ where: { isDemo: true } }),
    prisma.parent.count({ where: { isDemo: true } }),
    prisma.parent.count({ where: { isActive: true, pinHash: null } }),
    prisma.parent.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      <PageHeader title="Tetapan" description="Akaun admin, maklumat pusat tuisyen dan keselamatan." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Tukar Kata Laluan" icon={<KeyRound className="size-4" />} />
          <CardBody>
            <ActionForm action={changePassword} resetOnSuccess className="space-y-4">
              <Field label="Kata laluan semasa" name="currentPassword" required>
                <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kata laluan baharu" name="newPassword" required hint="Min. 10 aksara, huruf dan nombor">
                  <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
                </Field>
                <Field label="Sahkan kata laluan" name="confirmPassword" required>
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                </Field>
              </div>
              <div className="flex justify-end">
                <SubmitButton>Tukar Kata Laluan</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Profil Admin" icon={<UserRound className="size-4" />} />
          <CardBody>
            <ActionForm action={updateAdminProfile} className="space-y-4">
              <Field label="Nama paparan" name="name" required>
                <Input id="name" name="name" defaultValue={admin.name} required />
              </Field>
              <Field label="ID Admin (untuk log masuk)" name="loginId" required>
                <Input id="loginId" name="loginId" defaultValue={admin.loginId} className="font-mono uppercase" required />
              </Field>
              <div className="flex justify-end">
                <SubmitButton>Simpan Profil</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Maklumat Pusat Tuisyen" description="Dipaparkan pada laporan prestasi murid." icon={<School className="size-4" />} />
          <CardBody>
            <ActionForm action={updateCentreSettings} className="space-y-4">
              <Field label="Nama pusat tuisyen" name="centreName" required>
                <Input id="centreName" name="centreName" defaultValue={settings?.centreName ?? "Moons HomeTuition"} required />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="No. telefon" name="phone">
                  <Input id="phone" name="phone" defaultValue={settings?.phone ?? ""} />
                </Field>
                <Field label="Alamat" name="address">
                  <Input id="address" name="address" defaultValue={settings?.address ?? ""} />
                </Field>
              </div>
              <Field label="Nota kaki laporan" name="reportNote" hint="cth. ucapan terima kasih atau nota kepada ibu bapa">
                <Textarea id="reportNote" name="reportNote" defaultValue={settings?.reportNote ?? ""} />
              </Field>
              <div className="flex justify-end">
                <SubmitButton>Simpan</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Keselamatan Log Masuk Ibu Bapa" icon={<ShieldAlert className="size-4" />} />
          <CardBody className="space-y-3 text-sm leading-relaxed text-ink-soft">
            <p>
              Ibu bapa log masuk dengan <strong>ID Ibu Bapa sahaja</strong>. Ini mudah digunakan, tetapi sesiapa yang mengetahui ID
              tersebut boleh melihat rekod anak berkenaan. Langkah perlindungan yang telah dilaksanakan:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>ID dijana dengan akhiran rawak (cth. MHT004-K7QX) supaya sukar diteka.</li>
              <li>Cubaan log masuk yang gagal dihadkan (10 kali / 15 minit bagi setiap alamat IP).</li>
              <li>Semua data disemak di pelayan: ibu bapa hanya boleh melihat anak sendiri.</li>
              <li>Sesi disimpan dengan selamat dan boleh ditamatkan dengan menjana ID baharu atau menyahaktifkan akaun.</li>
            </ul>
            <p>
              <strong>Naik taraf kepada PIN:</strong> buka akaun di Maklumat Ibu Bapa dan tetapkan PIN 4–8 digit. Ibu bapa kemudian
              perlu memasukkan PIN selepas ID. Pada masa ini {parentsWithoutPin} daripada {totalParents} akaun aktif masih tanpa PIN.
            </p>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader
            title="Data Demo"
            description="Rekod contoh untuk ujian awal sahaja. Ditanda dengan label “Demo”."
            icon={<Trash2 className="size-4" />}
          />
          <CardBody>
            {demoStudents + demoParents === 0 ? (
              <p className="text-sm text-muted">Tiada data demo dalam sistem.</p>
            ) : (
              <ActionForm action={deleteDemoData} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <p className="flex-1 text-sm text-ink-soft">
                  Terdapat <strong>{demoStudents}</strong> murid demo dan <strong>{demoParents}</strong> akaun ibu bapa demo. Memadam data
                  demo juga akan memadam kehadiran, markah, keputusan sekolah dan ulasan mereka. Rekod sebenar anda tidak terjejas.
                </p>
                <Field label="Taip PADAM untuk sahkan" name="confirm">
                  <Input id="confirm" name="confirm" autoComplete="off" className="sm:w-44" />
                </Field>
                <SubmitButton variant="danger">Padam Semua Data Demo</SubmitButton>
              </ActionForm>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
