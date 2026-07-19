/**
 * Prisma seed entrypoint (`npm run seed` / `prisma db seed`).
 *
 * The implementation lives in src/seed so it is covered by `tsc` and shipped
 * in dist/, which lets a production container re-seed with `node dist/seed`
 * without needing tsx or the TypeScript toolchain installed.
 */
import { main } from "../src/seed";

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
