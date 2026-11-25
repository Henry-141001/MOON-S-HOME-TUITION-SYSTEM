import { notFound } from "next/navigation";
import { KeyRound, Power, RefreshCw, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatDateTime } from "@/lib/dates";
import { Badge, ButtonLink, Card, CardBody, CardHeader, DemoBadge, Input, PageHeader } from "@/components/ui";
import { ActionForm, ConfirmButton, Field, InlineAction, SubmitButton } from "@/components/forms";
import {
  deleteParent,
  regenerateParentId,
  removeParentPin,
  setParentActive,
  setParentPin,
  updateParent,
} from "@/app/admin/_actions/parents";
import { ParentForm } from "../parent-form";
import { CopyCode } from "../copy-code";
import { ObserveParentButton } from "../observe-button";
import { ConsentStatus } from "../consent-status";
import { observeParent } from "@/app/admin/_actions/observer";

export const metadata = { title: "Akaun Ibu Bapa" };

export default async function ParentDetailPage({ params }: PageProps<"/admin/ibu-bapa/[id]">) {
  const viewer = await requireAdminView();
  const { id } = await params;
  const [parent, students] = await Promise.all([
    prisma.parent.findUnique({
      where: { id },
      include: {
        children: { select: { studentId: true, relationship: true } },
        sessions: { where: { expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" }, take: 1, select: { createdAt: true } },
        _count: { select: { submissions: true, sessions: true } },
        consents: { orderBy: { agreedAt: "desc" }, take: 1 },
      },
    }),
    prisma.student.findMany({
      orderBy: [{ isActive: "desc" }, { fullName: "asc" }],
      select: { id: true, fullName: true, studentCode: true, isActive: true },
    }),
  ]);
  if (!parent) notFound();

  return (
    <>
      <PageHeader
        title={parent.name}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            Akaun ibu bapa
            {parent.isActive ? <Badge tone="success">Aktif</Badge> : <Badge tone="neutral">Tidak Aktif</Badge>}
            {parent.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          <>
            {viewer.readOnly && <ObserveParentButton action={observeParent.bind(null, parent.id)} size="md" />}
            <ButtonLink href="/admin/ibu-bapa" variant="secondary">
              Kembali
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Maklumat & Anak" />
          <CardBody className="py-5">
            <ParentForm
              action={updateParent.bind(null, parent.id)}
              students={students}
              defaults={{
                parentCode: parent.parentCode,
                name: parent.name,
                phone: parent.phone,
                notes: parent.notes,
                children: parent.children,
              }}
              submitLabel="Simpan Perubahan"
              codeHint="Menukar ID akan melog keluar ibu bapa ini daripada semua peranti."
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Pengesahan & Persetujuan" description="Direkodkan semasa ibu bapa log masuk kali pertama." />
            <CardBody className="space-y-3">
              <ConsentStatus consentAt={parent.consentAt} nameConfirmedAt={parent.nameConfirmedAt} />
              {parent.consents[0] ? (
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
                  <dt className="text-muted">ID Ibu Bapa</dt>
                  <dd className="font-medium">{parent.consents[0].parentCode}</dd>
                  <dt className="text-muted">Nama panggilan / samaran</dt>
                  <dd className="font-medium">{parent.consents[0].fullName}</dd>
                  <dt className="text-muted">No. telefon</dt>
                  <dd className="font-medium">{parent.consents[0].phone || "—"}</dd>
                  <dt className="text-muted">Tarikh & masa</dt>
                  <dd className="font-medium">{formatDateTime(parent.consents[0].agreedAt)}</dd>
                </dl>
              ) : (
                <p className="text-xs text-muted">
                  Ibu bapa akan diminta mengemas kini nama dan bersetuju dengan kenyataan persetujuan semasa log masuk kali pertama.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="ID Ibu Bapa" description="Berikan ID ini kepada ibu bapa untuk log masuk." />
            <CardBody className="space-y-3">
              <CopyCode code={parent.parentCode} large />
              <p className="text-xs text-muted">
                {parent._count.sessions > 0 && parent.sessions[0]
                  ? `Log masuk terakhir: ${formatDateTime(parent.sessions[0].createdAt)}`
                  : "Belum log masuk pada masa ini."}
              </p>
              <InlineAction action={regenerateParentId.bind(null, parent.id)} className="items-start">
                <ConfirmButton
                  variant="secondary"
                  message="Jana ID baharu? ID lama tidak lagi boleh digunakan dan ibu bapa akan dilog keluar. Anda perlu memberikan ID baharu kepada mereka."
                >
                  <RefreshCw className="size-4" /> Jana ID Baharu
                </ConfirmButton>
              </InlineAction>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="PIN (Pilihan)"
              icon={<KeyRound className="size-4" />}
              description="Lapisan keselamatan tambahan: ibu bapa perlu memasukkan PIN selepas ID."
            />
            <CardBody className="space-y-3">
              <p className="text-sm">
                Status:{" "}
                {parent.pinHash ? <Badge tone="success">PIN aktif</Badge> : <Badge tone="beige">Tiada PIN (ID sahaja)</Badge>}
              </p>
              <ActionForm action={setParentPin.bind(null, parent.id)} resetOnSuccess className="space-y-3">
                <Field label={parent.pinHash ? "Tukar PIN" : "Tetapkan PIN"} name="pin" hint="4–8 digit nombor">
                  <Input id="pin" name="pin" inputMode="numeric" autoComplete="off" maxLength={8} className="tracking-[0.3em]" />
                </Field>
                <SubmitButton variant="soft" size="sm">
                  Simpan PIN
                </SubmitButton>
              </ActionForm>
              {parent.pinHash && (
                <InlineAction action={removeParentPin.bind(null, parent.id)} className="items-start">
                  <ConfirmButton variant="ghost" message="Buang PIN? Ibu bapa akan log masuk menggunakan ID sahaja.">
                    Buang PIN
                  </ConfirmButton>
                </InlineAction>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tindakan Akaun" />
            <CardBody className="space-y-3">
              <InlineAction action={setParentActive.bind(null, parent.id, !parent.isActive)} className="w-full items-stretch">
                <ConfirmButton
                  variant="secondary"
                  size="md"
                  className="w-full"
                  message={
                    parent.isActive
                      ? "Nyahaktifkan akaun ini? Ibu bapa tidak lagi boleh log masuk sehingga diaktifkan semula."
                      : "Aktifkan semula akaun ini?"
                  }
                >
                  <Power className="size-4" /> {parent.isActive ? "Nyahaktifkan Akaun" : "Aktifkan Semula"}
                </ConfirmButton>
              </InlineAction>
              <InlineAction action={deleteParent.bind(null, parent.id)} className="w-full items-stretch">
                <ConfirmButton
                  size="md"
                  className="w-full"
                  message="Padam akaun ibu bapa ini secara kekal? Rekod anak dan keputusan sekolah yang telah dihantar akan KEKAL, tetapi pautan kepada akaun ini akan dibuang."
                >
                  <Trash2 className="size-4" /> Padam Akaun
                </ConfirmButton>
              </InlineAction>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
