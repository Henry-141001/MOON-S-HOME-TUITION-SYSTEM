// Status Yuran views — ADMIN ONLY (used on the admin dashboard and the Status Yuran page).
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { EmptyState, Table, cn, td, th } from "@/components/ui";
import { FeeStatusSelect } from "@/components/fee-status-select";
import { setFeeStatus } from "@/app/admin/_actions/fees";
import { PAYMENT_LABELS } from "@/lib/constants";
import { formatRM, type MonthFees } from "@/lib/fees";

/** Totals at the top: Jumlah Sudah Bayar / Belum Bayar / Tertunggak. */
export function FeeSummaryCards({ summary }: { summary: MonthFees["summary"] }) {
  const items = [
    { key: "PAID" as const, title: "Jumlah Sudah Bayar", Icon: CheckCircle2, tone: "border-success-ring bg-success-soft text-success-ink" },
    { key: "UNPAID" as const, title: "Jumlah Belum Bayar", Icon: Clock, tone: "border-amber-ink/20 bg-amber-soft text-amber-ink" },
    { key: "OVERDUE" as const, title: "Jumlah Tertunggak", Icon: AlertTriangle, tone: "border-rose-ink/20 bg-rose-soft text-rose-ink" },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map(({ key, title, Icon, tone }) => (
        <div key={key} className={cn("rounded-2xl border px-4 py-3.5", tone)}>
          <p className="flex items-center gap-1.5 text-[13px] font-medium">
            <Icon className="size-4" aria-hidden /> {title}
          </p>
          <p className="mt-1 font-display text-2xl font-semibold">{formatRM(summary[key].amount)}</p>
          <p className="text-xs opacity-80">{summary[key].students} murid</p>
        </div>
      ))}
    </div>
  );
}

/** Nama Murid | Kelas Hadir | Jumlah Yuran | Status Bayaran */
export function FeeTable({ fees }: { fees: MonthFees }) {
  if (fees.rows.length === 0) return <EmptyState title="Tiada murid untuk bulan ini" />;
  return (
    <Table>
      <thead>
        <tr>
          <th className={th}>Nama Murid</th>
          <th className={th}>Kelas Hadir</th>
          <th className={th}>Jumlah Yuran</th>
          <th className={th}>Status Bayaran</th>
        </tr>
      </thead>
      <tbody>
        {fees.rows.map((r) => (
          <tr key={r.studentId}>
            <td className={td}>
              <p className="font-medium">{r.name}</p>
              <p className="text-xs text-muted">
                {r.code}
                {!r.isActive && " · tidak aktif"}
              </p>
            </td>
            <td className={cn(td, "whitespace-nowrap")}>
              Hadir {r.attended}/{r.marked} kelas
            </td>
            <td className={cn(td, "whitespace-nowrap")}>
              <span className="font-semibold">{formatRM(r.amount)}</span>
              <span className="block text-xs text-muted">
                {r.attended} × {formatRM(fees.ratePerClass)}
              </span>
              {r.owedSincePaid > 0 && (
                <span className="mt-1 block max-w-56 whitespace-normal text-xs text-amber-ink">
                  +{formatRM(r.owedSincePaid)} kelas selepas dibayar (dibayar {formatRM(r.paidAmount ?? 0)})
                </span>
              )}
            </td>
            <td className={td}>
              <FeeStatusSelect
                action={setFeeStatus.bind(null, r.studentId, fees.month)}
                status={r.status}
                label={`Status Bayaran ${r.name}: ${PAYMENT_LABELS[r.status]}`}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
