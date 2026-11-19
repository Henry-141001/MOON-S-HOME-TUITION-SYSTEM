/**
 * Loads DEMO records for testing: 10 students, 7 families, attendance, tuition
 * tests, school results, teacher comments and upcoming sessions.
 * Every record is flagged isDemo = true and shows a "Demo" label in the app.
 *
 *   npm run db:seed-demo     # replaces any existing demo data
 *
 * Remove it any time in the app: Tetapan → Data Demo → Padam Semua Data Demo.
 */
import "dotenv/config";
import { randomInt } from "node:crypto";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import type { AttendanceStatus, CommentCategory, SchoolExamType, SubmissionStatus } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }) });

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const code4 = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

// Deterministic pseudo-random numbers so the demo looks the same each time.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
function todayMY() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
}
function addDays(iso: string, n: number) {
  const d = day(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const FAMILIES = [
  { parent: "Puan Aminah binti Ahmad", phone: "012-345 6701", kids: [["Nur Aisyah binti Rahman", "Tahun 5", "SK Taman Ria"], ["Muhammad Adam bin Rahman", "Tahun 3", "SK Taman Ria"]] },
  { parent: "Encik Lim Wei Ming", phone: "016-778 1202", kids: [["Lim Jia Hui", "Tahun 6", "SJK(C) Chung Hwa"]] },
  { parent: "Puan Kavitha a/p Raman", phone: "013-552 9803", kids: [["Priya a/p Suresh", "Tingkatan 1", "SMK Seri Indah"]] },
  { parent: "Puan Siti Hajar binti Ismail", phone: "019-210 4404", kids: [["Ahmad Danish bin Kamal", "Tahun 4", "SK Bukit Jaya"], ["Nur Iman binti Kamal", "Tahun 2", "SK Bukit Jaya"], ["Muhammad Harith bin Kamal", "Tingkatan 2", "SMK Bukit Jaya"]] },
  { parent: "Encik Tan Chee Keong", phone: "017-334 5505", kids: [["Tan Yi Xuan", "Tahun 5", "SJK(C) Yuk Chai"]] },
  { parent: "Puan Rosnah binti Yusof", phone: "011-2345 6606", kids: [["Aiman Hakimi bin Zulkifli", "Tingkatan 3", "SMK Taman Ria"]] },
  { parent: "Encik Mohd Faizal bin Hassan", phone: "014-889 7707", kids: [["Nurul Husna binti Faizal", "Tahun 6", "SK Taman Ria"]] },
];

const TUITION_SUBJECTS = ["Matematik", "Sains", "Bahasa Inggeris", "Bahasa Melayu"];

async function main() {
  const admin = await prisma.admin.findFirst();
  if (!admin) throw new Error("Run `npm run db:seed` first to create the admin account.");
  const subjects = await prisma.subject.findMany();
  const subjectId = (name: string) => {
    const s = subjects.find((x) => x.name === name);
    if (!s) throw new Error(`Subject "${name}" missing — run npm run db:seed first.`);
    return s.id;
  };

  // Replace any previous demo data.
  await prisma.$transaction([
    prisma.student.deleteMany({ where: { isDemo: true } }),
    prisma.parent.deleteMany({ where: { isDemo: true } }),
    prisma.tuitionExamination.deleteMany({ where: { isDemo: true } }),
    prisma.tuitionSession.deleteMany({ where: { isDemo: true } }),
  ]);

  const today = todayMY();
  const existingCodes = await prisma.student.findMany({ select: { studentCode: true } });
  const usedNumbers = new Set(existingCodes.map((c) => Number(c.studentCode.replace(/\D/g, ""))));
  const existingParents = await prisma.parent.findMany({ select: { parentCode: true } });
  const usedParentNumbers = new Set(existingParents.map((p) => Number(p.parentCode.slice(3).split("-")[0])));

  let studentNo = 1;
  let parentNo = 1;
  const nextStudentCode = () => {
    while (usedNumbers.has(studentNo)) studentNo++;
    usedNumbers.add(studentNo);
    return `STU${String(studentNo).padStart(3, "0")}`;
  };
  const nextParentCode = () => {
    while (usedParentNumbers.has(parentNo)) parentNo++;
    usedParentNumbers.add(parentNo);
    return `MHT${String(parentNo).padStart(3, "0")}-${code4()}`;
  };

  const students: { id: string; name: string; parentId: string; level: number }[] = [];
  const printed: string[] = [];

  for (const fam of FAMILIES) {
    const parentCode = nextParentCode();
    const parent = await prisma.parent.create({ data: { parentCode, name: fam.parent, phone: fam.phone, isDemo: true } });
    printed.push(`  ${parentCode}  ${fam.parent}  (${fam.kids.length} anak)`);
    for (const [name, yearForm, school] of fam.kids) {
      const level = Math.round(rand() * 2); // 0 = weaker, 1 = average, 2 = strong
      const enrolled = TUITION_SUBJECTS.filter((_, i) => i < 2 || rand() > 0.35);
      const student = await prisma.student.create({
        data: {
          studentCode: nextStudentCode(),
          fullName: name,
          school,
          yearForm,
          guardianName: fam.parent,
          registrationDate: day(addDays(today, -120 - Math.round(rand() * 90))),
          isDemo: true,
          subjects: { create: enrolled.map((s) => ({ subjectId: subjectId(s) })) },
          parents: { create: { parentId: parent.id, relationship: fam.parent.startsWith("Encik") ? "Bapa" : "Ibu" } },
        },
      });
      students.push({ id: student.id, name, parentId: parent.id, level });
    }
  }

  // Attendance: Tuesday & Thursday sessions over the last 8 weeks.
  const sessionDates: string[] = [];
  for (let i = 56; i >= 0; i--) {
    const d = addDays(today, -i);
    const dow = day(d).getUTCDay();
    if (dow === 2 || dow === 4) sessionDates.push(d);
  }
  const attendance = sessionDates.flatMap((date) =>
    students.map((s) => {
      const r = rand();
      const status: AttendanceStatus = r < 0.82 + s.level * 0.05 ? "PRESENT" : r < 0.93 ? "ABSENT" : "EXCUSED";
      return {
        studentId: s.id,
        date: day(date),
        status,
        note: status === "EXCUSED" ? "Demam (surat doktor)" : status === "ABSENT" ? null : null,
        recordedById: admin.id,
      };
    }),
  );
  await prisma.attendance.createMany({ data: attendance });

  // Tuition tests: 3 per subject over the last 3 months.
  const enrolments = await prisma.studentSubject.findMany({ where: { student: { isDemo: true } }, include: { subject: true } });
  let examCount = 0;
  for (const subject of TUITION_SUBJECTS) {
    for (const [i, offset] of [-75, -45, -14].entries()) {
      const exam = await prisma.tuitionExamination.create({
        data: {
          name: `Ujian Topikal ${i + 1}`,
          subjectId: subjectId(subject),
          date: day(addDays(today, offset - Math.round(rand() * 4))),
          totalMarks: 50,
          isDemo: true,
          createdById: admin.id,
        },
      });
      examCount++;
      const takers = enrolments.filter((e) => e.subject.name === subject);
      await prisma.tuitionResult.createMany({
        data: takers.map((e) => {
          const s = students.find((x) => x.id === e.studentId)!;
          const base = 0.48 + s.level * 0.15 + i * 0.04;
          const score = Math.max(8, Math.min(50, Math.round((base + (rand() - 0.5) * 0.2) * 50 * 2) / 2));
          return { examId: exam.id, studentId: e.studentId, marksObtained: score, remarks: score >= 45 ? "Cemerlang!" : null };
        }),
      });
    }
  }

  // School results submitted by parents.
  const schoolSubjects = ["Bahasa Melayu", "Bahasa Inggeris", "Matematik", "Sains", "Sejarah"];
  const exams: { type: SchoolExamType; name: string; offset: number; status: SubmissionStatus }[] = [
    { type: "MID_YEAR", name: "", offset: -150, status: "APPROVED" },
    { type: "MONTHLY_TEST", name: "Ujian Bulan September", offset: -60, status: "APPROVED" },
    { type: "UASA", name: "", offset: -10, status: "PENDING" },
  ];
  let schoolCount = 0;
  for (const [idx, s] of students.entries()) {
    for (const [j, ex] of exams.entries()) {
      if (j === 2 && idx % 3 === 2) continue; // not everyone has submitted UASA yet
      const status: SubmissionStatus = j === 1 && idx === 3 ? "NEEDS_CORRECTION" : ex.status;
      await prisma.schoolExamination.create({
        data: {
          studentId: s.id,
          submittedById: s.parentId,
          examType: ex.type,
          examName: ex.name,
          examDate: day(addDays(today, ex.offset)),
          status,
          adminNote: status === "NEEDS_CORRECTION" ? "Sila semak semula markah Sains — jumlah markah sepatutnya 100." : null,
          reviewedById: status === "PENDING" ? null : admin.id,
          reviewedAt: status === "PENDING" ? null : new Date(),
          results: {
            create: schoolSubjects.slice(0, 4 + (idx % 2)).map((name) => {
              const pct = Math.max(25, Math.min(98, Math.round((0.5 + s.level * 0.14 + j * 0.03 + (rand() - 0.5) * 0.25) * 100)));
              return { subjectId: subjectId(name), marksObtained: pct, totalMarks: 100 };
            }),
          },
        },
      });
      schoolCount++;
    }
  }

  // Teacher comments.
  const commentBank: Record<CommentCategory, string[]> = {
    ACADEMIC: ["Prestasi semakin baik, terutamanya dalam penyelesaian masalah.", "Prestasi stabil. Perlu lebih fokus semasa ujian."],
    STRENGTHS: ["Cepat memahami konsep baharu dan suka bertanya.", "Tulisan kemas dan jalan kerja tersusun."],
    IMPROVEMENT: ["Perlu lebih latihan dalam soalan berayat (KBAT).", "Perlu memperbanyakkan kosa kata Bahasa Inggeris."],
    PARTICIPATION: ["Aktif menjawab soalan dalam kelas.", "Agak pendiam, tetapi memberi perhatian."],
    HOMEWORK: ["Kerja rumah sentiasa disiapkan tepat pada masanya.", "Kadang-kadang lupa membawa kerja rumah."],
    ATTITUDE: ["Bersopan santun dan berdisiplin.", "Perlu kurangkan berbual semasa kelas."],
    RECOMMENDATIONS: ["Galakkan membaca buku cerita Bahasa Inggeris 15 minit setiap hari.", "Bantu anak menghafal sifir 6 hingga 9 di rumah."],
    GENERAL: ["Terima kasih atas sokongan ibu bapa.", "Teruskan usaha yang baik!"],
  };
  const cats = Object.keys(commentBank) as CommentCategory[];
  const comments = students.flatMap((s, i) =>
    cats
      .filter((_, k) => (k + i) % 2 === 0 || k < 3)
      .map((category, k) => ({
        studentId: s.id,
        category,
        content: commentBank[category][(i + k) % 2],
        commentDate: day(addDays(today, -3 - k * 9 - (i % 4))),
        isPublished: !(k === 0 && i % 5 === 0),
        authorId: admin.id,
      })),
  );
  await prisma.teacherComment.createMany({ data: comments });

  // Upcoming sessions (next two weeks, Tue & Thu).
  const upcoming: { date: Date; startTime: string; endTime: string; title: string; isDemo: boolean }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = addDays(today, i);
    const dow = day(d).getUTCDay();
    if (dow === 2) upcoming.push({ date: day(d), startTime: "15:00", endTime: "17:00", title: "Kelas Matematik & Sains", isDemo: true });
    if (dow === 4) upcoming.push({ date: day(d), startTime: "15:00", endTime: "17:00", title: "Kelas Bahasa Inggeris & Bahasa Melayu", isDemo: true });
  }
  await prisma.tuitionSession.createMany({ data: upcoming });

  console.log(`✓ Demo data loaded:
  ${students.length} students, ${FAMILIES.length} parent accounts, ${attendance.length} attendance records,
  ${examCount} tuition tests, ${schoolCount} school exam submissions, ${comments.length} comments, ${upcoming.length} upcoming sessions.

  Demo Parent IDs (for testing the parent portal):
${printed.join("\n")}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
