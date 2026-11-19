import "server-only";
import { Document, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { StudentReport } from "@/lib/report";
import { COMMENT_LABELS, gradeFor } from "@/lib/constants";
import { formatDate, formatLongDate, formatMonth, todayISO } from "@/lib/dates";

const C = {
  sage: "#5b7a59",
  sageLight: "#f0f4ee",
  beige: "#f7f2e9",
  beigeDark: "#b08d57",
  ink: "#2d3830",
  muted: "#7c867d",
  line: "#e9e2d5",
};

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 56, fontSize: 9.5, fontFamily: "Helvetica", color: C.ink, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottom: `2pt solid ${C.sage}`, paddingBottom: 10 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logo: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.sage, alignItems: "center", justifyContent: "center" },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 0.6 },
  small: { fontSize: 8, color: C.muted },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.sage, textAlign: "right" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 14 },
  infoCell: { width: "33.3%", marginBottom: 7, paddingRight: 8 },
  label: { fontSize: 7, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 9.5, fontFamily: "Helvetica-Bold", marginTop: 1 },
  boxes: { flexDirection: "row", gap: 6, marginTop: 8 },
  box: { flex: 1, backgroundColor: C.beige, borderRadius: 6, padding: 8, border: `0.5pt solid ${C.line}` },
  boxValue: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 3, marginBottom: 4, lineHeight: 1.1 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 10.5, fontFamily: "Helvetica-Bold", color: C.sage, borderBottom: `0.75pt solid ${C.line}`, paddingBottom: 3, marginBottom: 6 },
  table: { border: `0.5pt solid ${C.line}`, borderRadius: 4 },
  tr: { flexDirection: "row", borderBottom: `0.5pt solid ${C.line}` },
  th: { backgroundColor: C.beige, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.muted, padding: 4, textTransform: "uppercase" },
  td: { padding: 4, fontSize: 8.5 },
  barRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  barLabel: { width: 95, fontSize: 8.5 },
  barTrack: { flex: 1, height: 7, backgroundColor: C.beige, borderRadius: 3 },
  barValue: { width: 40, fontSize: 8, textAlign: "right" },
  note: { backgroundColor: C.sageLight, borderRadius: 6, padding: 10 },
  footerText: { fontSize: 7.5, color: C.muted },
});

function Table({ cols, rows }: { cols: { label: string; width: string }[]; rows: string[][] }) {
  return (
    <View style={s.table}>
      <View style={s.tr} fixed>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: c.width }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={[s.tr, i === rows.length - 1 ? { borderBottom: 0 } : {}]} wrap={false}>
          {r.map((cell, j) => (
            <Text key={j} style={[s.td, { width: cols[j].width }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Bars({ title, color, rows }: { title: string; color: string; rows: { subject: string; average: number }[] }) {
  return (
    <View style={{ flex: 1 }} wrap={false}>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 8.5, marginBottom: 4 }}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={s.small}>Tiada data.</Text>
      ) : (
        rows.map((r) => (
          <View key={r.subject} style={s.barRow}>
            <Text style={s.barLabel}>{r.subject}</Text>
            <View style={s.barTrack}>
              <View style={{ width: `${Math.max(2, Math.min(100, r.average))}%`, height: 7, backgroundColor: color, borderRadius: 3 }} />
            </View>
            <Text style={s.barValue}>{r.average.toFixed(1)}%</Text>
          </View>
        ))
      )}
    </View>
  );
}

const pct = (v: number | null) => (v === null ? "-" : `${v.toFixed(1)}%`);
const trend = (c: number | null) => (c === null ? "-" : c > 0 ? `naik ${c.toFixed(1)}%` : c < 0 ? `turun ${Math.abs(c).toFixed(1)}%` : "sama");

export function ReportDocument({ r }: { r: StudentReport }) {
  return (
    <Document title={`Laporan Prestasi - ${r.student.name}`} author={r.centre.name} subject="Laporan Prestasi Murid">
      <Page size="A4" style={s.page}>
        <Text style={[s.footerText, { position: "absolute", bottom: 20, left: 36 }]} fixed>
          {`${r.centre.name}  |  ${r.student.name} (${r.student.code})`}
        </Text>
        <View style={s.header}>
          <View style={s.brandRow}>
            <View style={s.logo}>
              <Svg viewBox="0 0 32 32" width={20} height={20}>
                <Path d="M20.5 4.5a12 12 0 1 0 7 19.8A10 10 0 0 1 20.5 4.5Z" fill="#f7f2e9" />
              </Svg>
            </View>
            <View>
              <Text style={s.brand}>{r.centre.name.toUpperCase()}</Text>
              <Text style={s.small}>{[r.centre.address, r.centre.phone].filter(Boolean).join("  |  ") || "Pusat Tuisyen Rumah"}</Text>
            </View>
          </View>
          <View>
            <Text style={s.title}>Laporan Prestasi Murid</Text>
            <Text style={[s.small, { textAlign: "right" }]}>Dijana pada {formatLongDate(todayISO())}</Text>
          </View>
        </View>

        <View style={s.infoGrid}>
          {[
            ["Nama Murid", r.student.name],
            ["ID Murid", r.student.code],
            ["Tahun / Tingkatan", r.student.yearForm],
            ["Sekolah", r.student.school],
            ["Ibu Bapa / Penjaga", r.student.guardian],
            ["Tarikh Daftar", formatDate(r.student.registrationDate)],
          ].map(([l, v]) => (
            <View key={l} style={s.infoCell}>
              <Text style={s.label}>{l}</Text>
              <Text style={s.value}>{v}</Text>
            </View>
          ))}
          <View style={{ width: "100%" }}>
            <Text style={s.label}>Subjek Didaftarkan</Text>
            <Text style={{ marginTop: 1 }}>{r.student.subjects.join(", ") || "-"}</Text>
          </View>
        </View>

        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.label}>Kehadiran</Text>
            <Text style={s.boxValue}>{pct(r.attendance.percent)}</Text>
            <Text style={s.small}>
              {r.attendance.present} hadir, {r.attendance.absent} tidak hadir
            </Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Bersebab</Text>
            <Text style={s.boxValue}>{r.attendance.excused}</Text>
            <Text style={s.small}>ketidakhadiran bersebab</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Purata Tuisyen</Text>
            <Text style={s.boxValue}>{pct(r.tuitionOverall)}</Text>
            <Text style={s.small}>{r.tuitionOverall === null ? "tiada ujian" : `Gred ${gradeFor(r.tuitionOverall).grade}, ${r.tuitionCount} ujian`}</Text>
          </View>
          <View style={s.box}>
            <Text style={s.label}>Purata Sekolah</Text>
            <Text style={s.boxValue}>{pct(r.schoolOverall)}</Text>
            <Text style={s.small}>{r.schoolOverall === null ? "tiada keputusan disahkan" : `Gred ${gradeFor(r.schoolOverall).grade}, ${r.school.length} peperiksaan`}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>1. Analisis Prestasi Akademik (purata mengikut subjek)</Text>
          <View style={{ flexDirection: "row", gap: 16 }}>
            <Bars title="Ujian Tuisyen" color={C.sage} rows={r.tuitionBySubject} />
            <Bars title="Peperiksaan Sekolah" color={C.beigeDark} rows={r.schoolBySubject} />
          </View>
          {r.tuitionBySubject.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Table
                cols={[
                  { label: "Subjek (Tuisyen)", width: "34%" },
                  { label: "Purata", width: "16%" },
                  { label: "Terkini", width: "16%" },
                  { label: "Sebelum", width: "16%" },
                  { label: "Trend", width: "18%" },
                ]}
                rows={r.tuitionBySubject.map((x) => [x.subject, pct(x.average), pct(x.latest), pct(x.previous), trend(x.change)])}
              />
            </View>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>2. Keputusan Ujian Tuisyen</Text>
          {r.tuition.length === 0 ? (
            <Text style={s.small}>Belum ada markah ujian tuisyen.</Text>
          ) : (
            <Table
              cols={[
                { label: "Tarikh", width: "15%" },
                { label: "Ujian", width: "33%" },
                { label: "Subjek", width: "20%" },
                { label: "Markah", width: "12%" },
                { label: "%", width: "10%" },
                { label: "Gred", width: "10%" },
              ]}
              rows={r.tuition.map((t) => [
                formatDate(t.date),
                t.examName,
                t.subject,
                `${t.marks}/${t.total}`,
                t.percent.toFixed(1),
                gradeFor(t.percent).grade,
              ])}
            />
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>3. Keputusan Peperiksaan Sekolah (disahkan)</Text>
          {r.school.length === 0 ? (
            <Text style={s.small}>Belum ada keputusan peperiksaan sekolah yang disahkan.</Text>
          ) : (
            <Table
              cols={[
                { label: "Peperiksaan", width: "30%" },
                { label: "Tarikh", width: "14%" },
                { label: "Subjek & Markah", width: "44%" },
                { label: "Purata", width: "12%" },
              ]}
              rows={r.school.map((e) => [
                e.title,
                formatDate(e.date),
                e.results.map((x) => `${x.subject}: ${x.marks}/${x.total} (${gradeFor(x.percent).grade})`).join("\n"),
                pct(e.overall),
              ])}
            />
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>4. Ringkasan Kehadiran</Text>
          {r.attendanceMonthly.length === 0 ? (
            <Text style={s.small}>Belum ada rekod kehadiran.</Text>
          ) : (
            <Table
              cols={[
                { label: "Bulan", width: "32%" },
                { label: "Hadir", width: "17%" },
                { label: "Tidak Hadir", width: "17%" },
                { label: "Bersebab", width: "17%" },
                { label: "Peratus", width: "17%" },
              ]}
              rows={r.attendanceMonthly.map((m) => [formatMonth(m.month), String(m.present), String(m.absent), String(m.excused), pct(m.percent)])}
            />
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>5. Ulasan Guru</Text>
          {[
            ["Kekuatan", r.comments.strengths],
            ["Ruang Penambahbaikan", r.comments.improvement],
          ].map(([title, items]) => (
            <View key={title as string} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: C.sage, fontSize: 8.5 }}>{title as string}</Text>
              {(items as StudentReport["comments"]["strengths"]).length === 0 ? (
                <Text style={s.small}>-</Text>
              ) : (
                (items as StudentReport["comments"]["strengths"]).slice(0, 2).map((c) => (
                  <Text key={c.id}>
                    {c.content} <Text style={s.small}>({formatDate(c.commentDate)})</Text>
                  </Text>
                ))
              )}
            </View>
          ))}
          {r.comments.other.map((c) => (
            <View key={c.id} style={{ marginBottom: 6 }} wrap={false}>
              <Text style={{ fontFamily: "Helvetica-Bold", color: C.sage, fontSize: 8.5 }}>
                {COMMENT_LABELS[c.category]} <Text style={s.small}>({formatDate(c.commentDate)})</Text>
              </Text>
              <Text>{c.content}</Text>
            </View>
          ))}
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.sectionTitle}>6. Cadangan Penambahbaikan</Text>
          <View style={s.note}>
            {r.comments.recommendations.length === 0 && r.autoNotes.length === 0 ? (
              <Text>Teruskan usaha yang baik. Tiada cadangan khusus pada masa ini.</Text>
            ) : (
              [...r.comments.recommendations.slice(0, 3).map((c) => c.content), ...r.autoNotes].map((n, i) => (
                <Text key={i} style={{ marginBottom: 2 }}>
                  - {n}
                </Text>
              ))
            )}
          </View>
        </View>

        <View style={{ marginTop: 26, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }} wrap={false}>
          <Text style={[s.small, { maxWidth: 300 }]}>{r.centre.note || `Terima kasih atas kepercayaan anda kepada ${r.centre.name}.`}</Text>
          <View style={{ alignItems: "center" }}>
            <View style={{ width: 150, borderBottom: `0.75pt solid ${C.ink}`, height: 28 }} />
            <Text style={[s.small, { marginTop: 3 }]}>Tandatangan Guru</Text>
          </View>
        </View>

      </Page>
    </Document>
  );
}
