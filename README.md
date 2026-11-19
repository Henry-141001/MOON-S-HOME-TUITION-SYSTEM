# System Muna

Next.js 16 (App Router, TypeScript, Tailwind) + Prisma 7 + Neon PostgreSQL, deployed on Vercel.

## Project layout

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Database tables (models). Edit this to add tables. |
| `prisma.config.ts` | Prisma CLI config (uses `DIRECT_URL` for migrations). |
| `src/lib/prisma.ts` | Shared database client — `import { prisma } from "@/lib/prisma"`. |
| `src/app/api/health/route.ts` | `GET /api/health` — checks the database connection. |
| `.env.example` | Template for environment variables. |

## 1. Create the Neon database

1. Go to [console.neon.tech](https://console.neon.tech) → **New Project** → name it `system-muna`
   (a separate project from Rakan Siswa, so each has its own storage quota). Pick the region
   closest to your users, e.g. **AWS Asia Pacific (Singapore)**.
2. Click **Connect** and copy two connection strings:
   - **Pooled** (hostname contains `-pooler`) → `DATABASE_URL`
   - **Direct** (turn "Connection pooling" off) → `DIRECT_URL`

## 2. Run locally

```bash
cp .env.example .env      # then paste your two Neon URLs into .env
npm install
npm run db:migrate        # creates tables in Neon (asks for a migration name, e.g. "init")
npm run dev               # http://localhost:3000  and  http://localhost:3000/api/health
```

`/api/health` should return `{"status":"ok","database":"connected"}`.

Useful commands:

- `npm run db:migrate` — after changing `schema.prisma`, create + apply a migration
- `npm run db:studio` — browse/edit data in a web UI

## 3. Deploy to Vercel

1. Push this folder to a new GitHub repo.
2. [vercel.com/new](https://vercel.com/new) → import the repo (Next.js is auto-detected).
3. **Environment Variables** → add `DATABASE_URL` and `DIRECT_URL` (same values as `.env`).
4. Deploy. The build runs `prisma generate && next build` automatically.

Migrations are **not** run during the Vercel build. Apply them from your PC with
`npm run db:migrate` (development) — both point at the same Neon database.

## 4. Custom domain (GitHub Student Pack)

Use one domain for all projects with subdomains, e.g. `muna.yourname.me`:

1. Vercel project → **Settings → Domains** → add `muna.yourname.me`.
2. In your registrar (e.g. Namecheap → Advanced DNS), add the **CNAME** record Vercel shows
   (host `muna` → `cname.vercel-dns.com`). HTTPS is set up automatically.

## Storage tips (Neon free tier ≈ 0.5 GB per project)

- Don't store images/files in PostgreSQL — use Vercel Blob or Cloudinary and save only the URL.
- Delete test data you no longer need.
