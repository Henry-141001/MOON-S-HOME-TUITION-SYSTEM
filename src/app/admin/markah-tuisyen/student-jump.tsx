"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";

/** "View by student" — jumps to the student's academic record. */
export function StudentJump({ students }: { students: { id: string; fullName: string; studentCode: string }[] }) {
  const router = useRouter();
  return (
    <Select
      defaultValue=""
      aria-label="Lihat markah mengikut murid"
      className="w-full py-2 sm:w-64"
      onChange={(e) => e.target.value && router.push(`/admin/murid/${e.target.value}?tab=akademik`)}
    >
      <option value="">Lihat mengikut murid…</option>
      {students.map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName} ({s.studentCode})
        </option>
      ))}
    </Select>
  );
}
