/**
 * Initial setup: creates the single ADMIN account, default subjects and centre settings.
 *
 *   npm run db:seed                     # first-time setup (safe to re-run)
 *   npm run admin:reset-password        # sets the admin password to ADMIN_PASSWORD again
 *
 * Reads ADMIN_ID, ADMIN_PASSWORD and ADMIN_NAME from .env.
 */
import "dotenv/config";
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
async function hashSecret(secret: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(secret, salt, 64);
  return ["scrypt", salt.toString("hex"), hash.toString("hex")].join("$");
}

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }) });

const DEFAULT_SUBJECTS = [
  "Bahasa Melayu",
  "Bahasa Inggeris",
  "Matematik",
  "Sains",
  "Sejarah",
  "Pendidikan Islam",
  "Pendidikan Moral",
  "Geografi",
];

async function main() {
  const reset = process.argv.includes("--reset-password");
  const loginId = (process.env.ADMIN_ID ?? "ADMIN").replace(/\s+/g, "").toUpperCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Cikgu Moon";

  const existing = await prisma.admin.findFirst();
  if (!existing) {
    if (!password || password.length < 10) {
      throw new Error("Set ADMIN_PASSWORD (at least 10 characters) in .env before running the seed.");
    }
    await prisma.admin.create({ data: { loginId, name, passwordHash: await hashSecret(password) } });
    console.log(`✓ Admin account created. Admin ID: ${loginId}`);
  } else if (reset) {
    if (!password || password.length < 10) throw new Error("Set ADMIN_PASSWORD (at least 10 characters) in .env.");
    await prisma.$transaction([
      prisma.admin.update({ where: { id: existing.id }, data: { passwordHash: await hashSecret(password) } }),
      prisma.session.deleteMany({ where: { adminId: existing.id } }),
    ]);
    console.log(`✓ Admin password reset for Admin ID: ${existing.loginId}. All admin sessions signed out.`);
  } else {
    console.log(`• Admin account already exists (Admin ID: ${existing.loginId}). Password not changed.`);
  }

  for (const subject of DEFAULT_SUBJECTS) {
    await prisma.subject.upsert({ where: { name: subject }, create: { name: subject }, update: {} });
  }
  console.log(`✓ ${DEFAULT_SUBJECTS.length} default subjects ready.`);

  await prisma.appSetting.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  console.log("✓ Centre settings ready.");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
