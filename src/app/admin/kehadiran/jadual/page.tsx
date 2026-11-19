import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatLongDate, parseISODate, todayISO, toISODate } from "@/lib/dates";
import { Card, CardHeader, EmptyState, Input, Select, Table, Textarea, buttonClass, cn, td, th } from "@/components/ui";
import { ActionForm, ConfirmButton, Field, InlineAction, Modal, SubmitButton } from "@/components/forms";
import { createTuitionSession, deleteTuitionSession, updateTuitionSession } from "@/app/admin/_actions/attendance";
import type { ActionState } from "@/lib/action-state";

export const metadata = { title: "Jadual Sesi Tuisyen" };

export default async function SchedulePage() {
  await requireAdminView();
  const today = parseISODate(todayISO());
  const [upcoming, past, subjects] = await Promise.all([
    prisma.tuitionSession.findMany({
      where: { date: { gte: today } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { subject: true },
    }),
    prisma.tuitionSession.findMany({
      where: { date: { lt: today } },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 20,
      include: { subject: true },
    }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Sesi Akan Datang"
          description="Dipaparkan di dashboard admin."
          actions={
            <Modal
              trigger={
                <>
                  <Plus className="size-4" /> Jadualkan Sesi
                </>
              }
              title="Sesi Tuisyen Baharu"
            >
              <SessionForm action={createTuitionSession} subjects={subjects} defaults={{ date: todayISO() }} submitLabel="Simpan Sesi" />
            </Modal>
          }
        />
        <SessionTable sessions={upcoming} subjects={subjects} empty="Tiada sesi akan datang dijadualkan." />
      </Card>

      <Card>
        <CardHeader title="Sesi Lepas" description="20 sesi terakhir" />
        <SessionTable sessions={past} subjects={subjects} empty="Tiada sesi lepas." past />
      </Card>
    </div>
  );
}

type SessionRow = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  title: string;
  subjectId: string | null;
  notes: string | null;
  isDemo: boolean;
  subject: { name: string } | null;
};

function SessionTable({
  sessions,
  subjects,
  empty,
  past = false,
}: {
  sessions: SessionRow[];
  subjects: { id: string; name: string }[];
  empty: string;
  past?: boolean;
}) {
  if (sessions.length === 0) return <EmptyState title={empty} />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Tarikh</th>
          <th className={th}>Masa</th>
          <th className={th}>Sesi</th>
          <th className={th}>Catatan</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => (
          <tr key={s.id} className={cn(past && "text-ink-soft")}>
            <td className={cn(td, "whitespace-nowrap font-medium")}>{formatLongDate(s.date)}</td>
            <td className={cn(td, "whitespace-nowrap")}>
              {s.startTime}–{s.endTime}
            </td>
            <td className={td}>
              {s.title}
              {s.subject && <span className="block text-xs text-muted">{s.subject.name}</span>}
            </td>
            <td className={cn(td, "text-xs text-ink-soft")}>{s.notes || "—"}</td>
            <td className={td}>
              <div className="flex justify-end gap-1.5">
                <Link href={`/admin/kehadiran?tarikh=${toISODate(s.date)}`} className={buttonClass("soft", "sm")}>
                  Kehadiran
                </Link>
                <Modal trigger="Edit" triggerVariant="ghost" triggerSize="sm" title="Kemas Kini Sesi">
                  <SessionForm
                    action={updateTuitionSession.bind(null, s.id)}
                    subjects={subjects}
                    defaults={{ ...s, date: toISODate(s.date) }}
                    submitLabel="Simpan Perubahan"
                  />
                </Modal>
                <InlineAction action={deleteTuitionSession.bind(null, s.id)}>
                  <ConfirmButton message="Padam sesi ini daripada jadual? Rekod kehadiran tidak terjejas.">Padam</ConfirmButton>
                </InlineAction>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function SessionForm({
  action,
  subjects,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  subjects: { id: string; name: string }[];
  defaults: { date?: string; startTime?: string; endTime?: string; title?: string; subjectId?: string | null; notes?: string | null };
  submitLabel: string;
}) {
  return (
    <ActionForm action={action} className="space-y-4">
      <Field label="Tajuk sesi" name="title" required>
        <Input id="title" name="title" defaultValue={defaults.title} placeholder="cth. Kelas Matematik Tahun 5" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Tarikh" name="date" required>
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </Field>
        <Field label="Mula" name="startTime" required>
          <Input id="startTime" name="startTime" type="time" defaultValue={defaults.startTime ?? "15:00"} required />
        </Field>
        <Field label="Tamat" name="endTime" required>
          <Input id="endTime" name="endTime" type="time" defaultValue={defaults.endTime ?? "17:00"} required />
        </Field>
      </div>
      <Field label="Subjek (pilihan)" name="subjectId">
        <Select id="subjectId" name="subjectId" defaultValue={defaults.subjectId ?? ""}>
          <option value="">— Pelbagai / tiada —</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Catatan" name="notes">
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
