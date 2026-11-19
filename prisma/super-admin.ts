/**
 * Super admin (Pemerhati) access code management. The code is typed into the
 * "ID Ibu Bapa" field on the login page and opens the read-only observer view.
 *
 *   npm run superadmin:create              # create the account (once)
 *   npm run superadmin:rotate              # replace the code (old code stops working)
 *   npm run superadmin:pin -- 123456       # require this PIN after the code
 *   npm run superadmin:pin -- off          # remove the PIN
 *
 * The code is saved to .env as SUPER_ADMIN_ID (never committed to Git).
 * Name shown in the app: SUPER_ADMIN_NAME in .env (default "Pemerhati").
 */
import "dotenv/config";
import { randomBytes, randomInt, scrypt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }) });
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** SA-XXXX-XXXX-XXXX: 12 random characters ≈ 59 bits — not guessable, even without a PIN. */
function newCode() {
  const group = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `SA-${group()}-${group()}-${group()}`;
}

async function hashSecret(secret: string) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(secret, salt, 64);
  return ["scrypt", salt.toString("hex"), hash.toString("hex")].join("$");
}

function saveToEnv(code: string) {
  const path = ".env";
  let env = "";
  try {
    env = readFileSync(path, "utf8");
  } catch {
    /* no .env yet */
  }
  const line = `SUPER_ADMIN_ID="${code}"`;
  env = /^SUPER_ADMIN_ID=.*$/m.test(env)
    ? env.replace(/^SUPER_ADMIN_ID=.*$/m, line)
    : `${env.trimEnd()}\n\n# Super admin (Pemerhati) access code — type it into the "ID Ibu Bapa" field.\n${line}\n`;
  writeFileSync(path, env);
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  const name = process.env.SUPER_ADMIN_NAME ?? "Pemerhati";
  const existing = await prisma.superAdmin.findFirst();

  if (command === "create") {
    if (existing) {
      console.log("• A super admin already exists. Use `npm run superadmin:rotate` to get a new code.");
      return;
    }
    const code = newCode();
    await prisma.superAdmin.create({ data: { accessCode: code, name } });
    saveToEnv(code);
    console.log(`✓ Super admin "${name}" created. The access code is saved in .env as SUPER_ADMIN_ID.`);
    return;
  }

  if (!existing) throw new Error("No super admin yet. Run `npm run superadmin:create` first.");

  if (command === "rotate") {
    const code = newCode();
    await prisma.$transaction([
      prisma.superAdmin.update({ where: { id: existing.id }, data: { accessCode: code } }),
      prisma.session.deleteMany({ where: { superAdminId: existing.id } }),
    ]);
    saveToEnv(code);
    console.log("✓ New access code saved in .env as SUPER_ADMIN_ID. The old code no longer works.");
    return;
  }

  if (command === "pin") {
    if (arg === "off") {
      await prisma.superAdmin.update({ where: { id: existing.id }, data: { pinHash: null } });
      console.log("✓ PIN removed. Login now uses the access code only.");
      return;
    }
    if (!arg || !/^\d{4,8}$/.test(arg)) throw new Error("Usage: npm run superadmin:pin -- 123456   (4–8 digits)   or   -- off");
    await prisma.$transaction([
      prisma.superAdmin.update({ where: { id: existing.id }, data: { pinHash: await hashSecret(arg) } }),
      prisma.session.deleteMany({ where: { superAdminId: existing.id } }),
    ]);
    console.log("✓ PIN set. It will be asked for after the access code.");
    return;
  }

  throw new Error("Unknown command. Use: create | rotate | pin <digits|off>");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
