# Moon's Home Tuition System

A web-based tuition management system for Moon's Home Tuition. There are **two roles only**:

| Role | Logs in with | Can do |
|---|---|---|
| **ADMIN** (the teacher) | Admin ID + password | Everything: students, parents, subjects, attendance, tuition marks, comments, school-result review, reports, settings |
| **PARENT** | Parent ID only (optional PIN) | View own children's profile, attendance, tuition marks, comments and charts; submit / edit / delete own children's **school** results |

**Stack:** Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Prisma 7 · Neon PostgreSQL · Recharts · @react-pdf/renderer · deployed on Vercel.

---

## 1. Run it on your computer

```bash
npm install
npm run dev            # http://localhost:3000
```

`.env` must contain (see `.env.example`):

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Neon **pooled** connection string (host contains `-pooler`) — used by the app |
| `DIRECT_URL` | Neon **direct** connection string — used by migrations and seed scripts |
| `ADMIN_ID`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Only used once by `npm run db:seed` to create the admin account |

### First-time database setup (already done for your Neon database)

```bash
npm run db:deploy      # create all tables
npm run db:seed        # create the admin account + default subjects
npm run db:seed-demo   # OPTIONAL: 10 demo students / 7 families for testing
```

`db:seed-demo` prints the demo Parent IDs so you can try the parent portal.

---

## 2. Deploy to Vercel

1. Push to GitHub: `git add .` → `git commit -m "..."` → `git push`. Vercel redeploys automatically.
2. In Vercel → Project → **Settings → Environment Variables**, make sure these exist:
   - `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) — same values as your `.env`.
   - The `ADMIN_*` variables are **not** needed on Vercel.
3. After deploying, open `/api/health` — it should say `"database":"connected"`.

**Database changes are never applied by Vercel.** Whenever `prisma/schema.prisma` changes, run
`npm run db:migrate` (development) or `npm run db:deploy` (apply existing migrations) from your PC.

### Custom domain (GitHub Student Pack)
Vercel → Settings → Domains → add e.g. `moon.yourname.me`, then copy the CNAME record into your
registrar's DNS. HTTPS is automatic.

---

## 3. Everyday use (Admin)

| Menu | What you do there |
|---|---|
| **Dashboard** | Today's attendance, overall attendance %, recent results, parent submissions, upcoming sessions, recent comments, charts |
| **Maklumat Murid** | Add / edit / deactivate / delete students, upload photos, assign subjects, view full profile (records, attendance, comments, analysis) |
| **Maklumat Ibu Bapa** | Create parent accounts, generate Parent IDs, link one ID to several children, set an optional PIN, regenerate an ID, deactivate |
| **Subjek Tuisyen** | Manage the subject list (used for enrolment, tuition tests and school results) |
| **Rekod Kehadiran** | Pick a date → *Tandakan Semua Hadir* → change only the absent ones → Save. Tabs for history, statistics (per student & monthly) and the session timetable |
| **Markah Ujian Tuisyen** | Create a test (subject, date, total marks) → enter every student's marks on one sheet |
| **Ulasan Guru** | Pick a student → write dated comments by category; publish or keep as draft |
| **Keputusan Ujian Sekolah** | Review parent submissions: approve, edit, or request a correction (the note is shown to the parent) |
| **Laporan** | View, print or download a branded PDF report per student |
| **Tetapan** | Change password / Admin ID, centre details for reports, security notes, delete demo data |

### Rules built into the system
- School results and tuition results are stored in **separate tables** and are never combined; every chart and table labels which is which.
- Percentages are calculated automatically; marks can't exceed the total.
- Attendance % = present ÷ (present + absent). Excused absences don't count against the student.
- One attendance record per student per day; one tuition mark per student per test; no duplicate school submissions (same student + type + name + date).
- Parents can edit/delete their school submissions **until the teacher approves them**; editing sends it back to *Menunggu Semakan*.
- Only **published** comments and only **approved** school results appear on parent-facing reports.
- Deactivating keeps all history; *Padam Kekal* removes a student and all their records permanently.

---

## 4. Security

- All data access happens on the server (Server Components, Server Actions, Route Handlers). The browser never talks to the database, and the Neon URLs are server-only environment variables.
- Every admin page/action calls `requireAdmin()`; every parent page/action calls `requireParent()` **and** checks the child belongs to that parent (`resolveParentChild` / `assertParentOwnsStudent`). Parents have no actions at all for attendance, tuition marks or comments.
- Sessions: random 256-bit token in an `HttpOnly`, `SameSite=Lax`, `Secure` (in production) cookie; only its SHA-256 hash is stored in the `sessions` table. Admin sessions last 7 days, parent sessions 30 days. Logging out deletes the session.
- Passwords and PINs are hashed with scrypt. Failed logins are rate-limited per IP (admin: 5, parent: 10 per 15 minutes).
- Student photos are stored in the database and served only to the admin or that student's own parent.
- Security headers (no framing, no MIME sniffing, HSTS, strict referrer) are set in `next.config.ts`.

### Limits of Parent-ID-only login (please read)
A Parent ID works like a key: **anyone who knows it can see that family's records**. To reduce the risk,
IDs have a random part (e.g. `MHT004-K7QX`) so they can't be guessed by counting, guessing attempts are
rate-limited, and you can **regenerate** an ID or **deactivate** an account at any time (this signs the
family out everywhere). Share IDs privately and never post them in group chats.

**Upgrade path — PIN:** open a parent account and set a 4–8 digit PIN. From then on that family must type
the PIN after their Parent ID. You can enable it for one family or all of them; no code change is needed.

---

## 5. Maintenance

| Task | How |
|---|---|
| Forgot admin password | Put a new password in `.env` → `ADMIN_PASSWORD="..."`, then `npm run admin:reset-password` |
| Remove demo data | Tetapan → Data Demo → type `PADAM` → *Padam Semua Data Demo* |
| Reload demo data | `npm run db:seed-demo` (replaces only demo records) |
| Back up data | Neon console → your project → **Branches** → create a branch (instant snapshot), or **Backup & Restore** |
| Browse raw data | `npm run db:studio` |
| Check storage | Neon console → project → Storage (free tier ≈ 0.5 GB; photos are resized to ~50 KB each) |
| Change tables | edit `prisma/schema.prisma` → `npm run db:migrate` → commit the new `prisma/migrations/*` folder |

---

## 6. Project structure

```
prisma/
  schema.prisma          Database tables (admin, parents, students, parent_students, subjects,
                         attendance, tuition_examinations, tuition_results, teacher_comments,
                         school_examinations, school_results, sessions, …)
  seed.ts / seed-demo.ts Admin + subjects / demo data
src/
  proxy.ts               Redirects visitors without a session cookie to the login page
  lib/                   session & access control, validation, analytics, report data, PDF
  components/            UI kit, forms, charts, shared record views, app shell
  app/
    page.tsx             Login (Admin / Ibu Bapa)
    admin/               Admin portal (+ _actions/ server actions)
    ibu-bapa/            Parent portal (+ _actions.ts)
    api/foto/[id]        Private student photos
    api/laporan/[id]     PDF report download (admin only)
    api/health           Database health check
```
