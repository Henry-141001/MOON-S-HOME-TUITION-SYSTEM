import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/dates";

/** First-login consent status of a parent account, for the admin. */
export function ConsentStatus({ consentAt, nameConfirmedAt }: { consentAt: Date | null; nameConfirmedAt: Date | null }) {
  if (consentAt) {
    return (
      <span className="flex flex-col items-start gap-0.5">
        <Badge tone="success">Telah bersetuju</Badge>
        <span className="text-xs text-muted">{formatDateTime(consentAt)}</span>
      </span>
    );
  }
  if (nameConfirmedAt) return <Badge tone="amber">Nama dikemas kini · belum setuju</Badge>;
  return <Badge tone="neutral">Belum log masuk kali pertama</Badge>;
}
