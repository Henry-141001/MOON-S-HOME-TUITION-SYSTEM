// Local, throwaway Postgres for testing (PGlite = Postgres compiled to WebAssembly).
// Nothing is installed system-wide and nothing touches the real Neon database.
//
//   node scripts/test-db.mjs            # starts an empty in-memory database on 127.0.0.1:54329
//
// Then point the app and scripts at it, e.g.:
//   DB_DRIVER=pg DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres \
//   DIRECT_URL=postgresql://postgres:postgres@127.0.0.1:54329/postgres npx prisma migrate deploy
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const port = Number(process.env.TEST_DB_PORT ?? 54329);
const db = await PGlite.create();
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 16 });
await server.start();
console.log(`TEST DB READY on 127.0.0.1:${port} (in-memory, discarded when this process stops)`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
