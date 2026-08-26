import { assertDatabaseIdentity, createDatabase } from "./db/client.js";
import { buildApp } from "./app.js";

const { db, client } = createDatabase();
const app = buildApp({ db });

async function main() {
  await assertDatabaseIdentity(db);
  await app.fileStore.init();
  await app.listen({ port: Number(process.env.PORT ?? 3001), host: process.env.HOST ?? "0.0.0.0" });
}

main().catch(async (error) => {
  app.log.error(error);
  await client.end({ timeout: 5 });
  process.exit(1);
});
