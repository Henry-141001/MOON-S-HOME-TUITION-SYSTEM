import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdminView } from "@/lib/session";
import { formatLongDate, parseISODate, todayISO, toISODate } from "@/lib/dates";
import { Card, CardHeader, EmptyState, Input, Select, Table, Textarea, buttonClass, cn, td, th } from "@/components/ui";
import { SessionStatusBadge, SubjectChip } from "@/components/schedule";
import { SESSION_STATUSES, SESSION_STATUS_LABELS, isRunningSession, type SessionStatusValue } from "@/lib/constants";
import { ActionForm, ConfirmButton, Field, InlineAction, Modal, SubmitButton } from "@/components/forms";
import { cancelTuitionSession, createTuitionSession, deleteTuitionSession, updateTuitionSession } from "@/app/admin/_actions/attendance";
import type { ActionState } from "@/lib/action-state";

export const metadata = { title: "Jadual Kelas" };

export default async function SchedulePage() {
  await requireAdminView();
  const today = parseISODate(todayISO());
  const [upcoming, past, subjects] = await Promise.all([
    prisma.tuitionSession.findMany({
      where: { date: { gte: today } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      include: { subjects: { include: { subject: { select: { id: true, name: true } } }, orderBy: { subject: { name: "asc" } } } },
    }),
    prisma.tuitionSession.findMany({
      where: { date: { lt: today } },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 20,
      include: { subjects: { include: { subject: { select: { id: true, name: true } } }, orderBy: { subject: { name: "asc" } } } },
    }),
    prisma.subject.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Sesi Akan Datang"
          description="Dipaparkan kepada ibu bapa dalam Jadual Kelas. Jika kelas dibatalkan, dicutikan atau ada kelas ganti, ibu bapa diberi notifikasi secara automatik."
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
  notes: string | null;
  status: SessionStatusValue;
  isDemo: boolean;
  subjects: { subject: { id: string; name: string } }[];
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
          <th className={th}>Status</th>
          <th className={th}>Catatan</th>
          <th className={th}></th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s, i) => (
          <tr key={s.id} className={cn((past || s.status === "CANCELLED" || s.status === "HOLIDAY") && "text-ink-soft")}>
            <td className={cn(td, "whitespace-nowrap font-medium")}>{formatLongDate(s.date)}</td>
            <td className={cn(td, "whitespace-nowrap")}>
              {s.startTime}–{s.endTime}
            </td>
            <td className={td}>
              {s.title}
              <span className="mt-1 flex flex-wrap gap-1">
                {s.subjects.length === 0 ? (
                  <SubjectChip name={null} />
                ) : (
                  s.subjects.map(({ subject }) => <SubjectChip key={subject.id} name={subject.name} />)
                )}
              </span>
            </td>
            <td className={td}>
              <SessionStatusBadge
                status={s.status}
                isNext={!past && sessions.findIndex((x) => isRunningSession(x.status)) === i}
              />
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
                    defaults={{ ...s, date: toISODate(s.date), subjectIds: s.subjects.map((x) => x.subject.id) }}
                    submitLabel="Simpan Perubahan"
                  />
                </Modal>
                {!past && isRunningSession(s.status) && (
                  <InlineAction action={cancelTuitionSession.bind(null, s.id)}>
                    <ConfirmButton
                      variant="ghost"
                      message="Batalkan kelas ini? Ibu bapa murid yang terlibat akan menerima notifikasi secara automatik."
                    >
                      Batalkan
                    </ConfirmButton>
                  </InlineAction>
                )}
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
  defaults: {
    date?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    subjectIds?: string[];
    notes?: string | null;
    status?: SessionStatusValue;
  };
  submitLabel: string;
}) {
  const selected = new Set(defaults.subjectIds ?? []);
  return (
    <ActionForm action={action} className="space-y-4">
      <Field label="Tajuk sesi" name="title" required>
        <Input id="title" name="title" defaultValue={defaults.title} placeholder="cth. Kelas Matematik Tahun 5" required />
      </Field>
      <Field
        label="Status"
        name="status"
        required
        hint="Jika ditukar kepada Dibatalkan, Cuti, Kelas Ganti atau Kelas Tambahan, ibu bapa akan menerima notifikasi secara automatik. Yuran dikira daripada kehadiran, termasuk kelas ganti dan kelas tambahan."
      >
        <Select id="status" name="status" defaultValue={defaults.status ?? "SCHEDULED"} required>
          {SESSION_STATUSES.map((st) => (
            <option key={st} value={st}>
              {SESSION_STATUS_LABELS[st]}
            </option>
          ))}
        </Select>
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
      <fieldset>
        <legend className="text-[13px] font-medium text-ink-soft">Subjek kelas ini (boleh pilih lebih daripada satu)</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {subjects.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-line px-3 py-2 text-sm hover:bg-beige-50 has-checked:border-navy-300 has-checked:bg-navy-50"
            >
              <input type="checkbox" name="subjectIds" value={s.id} defaultChecked={selected.has(s.id)} className="size-4 accent-navy-600" />
              {s.name}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          Peringatan kelas dipaparkan kepada ibu bapa murid yang mengambil subjek yang ditanda. Jika tiada subjek ditanda,
          semua ibu bapa akan menerima peringatan.
        </p>
      </fieldset>
      <Field label="Catatan" name="notes">
        <Textarea id="notes" name="notes" defaultValue={defaults.notes ?? ""} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </ActionForm>
  );
}
