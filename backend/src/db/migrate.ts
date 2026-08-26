import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { assertDatabaseIdentity, createDatabase } from "./client.js";

const { db, client } = createDatabase();

async function main() {
  await assertDatabaseIdentity(db, { allowBootstrap: true });
  await db.execute(sql`create table if not exists _transporte_seguro_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);

  const name = "0001_init.sql";
  const [{ count }] = await db.execute<{ count: string }>(
    sql`select count(*)::text as count from _transporte_seguro_migrations where name = ${name}`,
  );
  if (count === "0") {
    const migration = await readFile(new URL(`migrations/${name}`, import.meta.url), "utf8");
    await db.transaction(async (transaction) => {
      await transaction.execute(sql.raw(migration));
      await transaction.execute(
        sql`insert into _transporte_seguro_migrations (name) values (${name})`,
      );
    });
  }
  await assertDatabaseIdentity(db);
  console.log("Banco do Transporte Seguro validado e atualizado.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => client.end({ timeout: 5 }));
