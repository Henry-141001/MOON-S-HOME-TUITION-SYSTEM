import { Wallet } from "lucide-react";
import { requireAdminView } from "@/lib/session";
import { formatMonth, todayISO } from "@/lib/dates";
import { formatRM, monthFees } from "@/lib/fees";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  PageHeader,
  buttonClass,
} from "@/components/ui";
import { ActionForm, Field, Modal, SubmitButton } from "@/components/forms";
import { FeeSummaryCards, FeeTable } from "@/components/fees";
import { setFeeRate } from "@/app/admin/_actions/fees";

export const metadata = { title: "Status Yuran" };

/** ADMIN ONLY. Fees come from attendance; the admin only sets Status Bayaran. */
export default async function FeeStatusPage({
  searchParams,
}: PageProps<"/admin/yuran">) {
  const viewer = await requireAdminView();
  const sp = await searchParams;
  const month =
    typeof sp.bulan === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.bulan)
      ? sp.bulan
      : todayISO().slice(0, 7);
  const fees = await monthFees(month);

  return (
    <>
      <PageHeader
        title="Status Yuran"
        description="Yuran dikira secara automatik daripada kehadiran: bilangan kelas Hadir × yuran sekelas. Kelas ganti dan kelas tambahan dikira apabila murid ditanda Hadir. Hanya admin boleh melihat halaman ini."
      />

      <Card className="mb-6">
        <CardHeader
          title={`Bulan: ${formatMonth(month)}`}
          description={`Yuran sekelas: ${formatRM(fees.ratePerClass)}${fees.rateFrom ? ` (mulai ${formatMonth(fees.rateFrom)})` : ""}`}
          icon={<Wallet className="size-4" />}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <form className="flex items-center gap-2">
                <Input
                  type="month"
                  name="bulan"
                  defaultValue={month}
                  className="w-40 py-1.5"
                  aria-label="Bulan"
                />
                <button
                  type="submit"
                  className={buttonClass("secondary", "sm")}
                >
                  Papar
                </button>
              </form>
              {!viewer.readOnly && (
                <Modal
                  trigger="Tukar Yuran Sekelas"
                  triggerVariant="ghost"
                  triggerSize="sm"
                  title="Yuran Sekelas"
                >
                  <ActionForm action={setFeeRate} className="space-y-4">
                    <Field
                      label="Yuran untuk setiap kelas yang dihadiri (RM)"
                      name="ratePerClass"
                      required
                    >
                      <Input
                        id="ratePerClass"
                        name="ratePerClass"
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.5"
                        defaultValue={fees.ratePerClass}
                        required
                      />
                    </Field>
                    <Field
                      label="Berkuat kuasa mulai bulan"
                      name="effectiveMonth"
                      required
                      hint="Bulan sebelumnya kekal dengan kadar lama."
                    >
                      <Input
                        id="effectiveMonth"
                        name="effectiveMonth"
                        type="month"
                        defaultValue={month}
                        required
                      />
                    </Field>
                    <div className="flex justify-end">
                      <SubmitButton>Simpan</SubmitButton>
                    </div>
                  </ActionForm>
                </Modal>
              )}
            </div>
          }
        />
        <CardBody>
          <FeeSummaryCards summary={fees.summary} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Senarai Murid"
          description="Kemas kini Status Bayaran sahaja: Sudah Bayar / Belum Bayar / Tertunggak."
        />
        <FeeTable fees={fees} />
      </Card>
    </>
  );
}
