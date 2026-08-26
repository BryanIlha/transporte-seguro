import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { eq, sql } from "drizzle-orm";
import { appMetadata } from "./schema.js";
import * as schema from "./schema.js";

export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL não configurada.");
  const client = postgres(connectionString, { max: 10, idle_timeout: 20, connect_timeout: 10 });
  return { client, db: drizzle(client, { schema }) };
}

export async function assertDatabaseIdentity(
  db: Database,
  options: { allowBootstrap?: boolean } = {},
) {
  const expectedDatabase = process.env.EXPECTED_DATABASE_NAME ?? "transporte_seguro";
  const expectedProject = process.env.PROJECT_KEY ?? "transporte-seguro";
  const [{ currentDatabase }] = await db.execute<{ currentDatabase: string }>(sql`
    select current_database() as "currentDatabase"
  `);

  if (currentDatabase !== expectedDatabase) {
    throw new Error(
      `Banco incorreto: esperado ${expectedDatabase}, conectado em ${currentDatabase}. Operação cancelada.`,
    );
  }

  const [{ tableExists }] = await db.execute<{ tableExists: boolean }>(sql`
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = 'app_metadata'
    ) as "tableExists"
  `);
  if (!tableExists) {
    if (options.allowBootstrap) return;
    throw new Error("Identidade do banco inválida: tabela app_metadata não encontrada.");
  }

  const [identity] = await db
    .select()
    .from(appMetadata)
    .where(eq(appMetadata.projectKey, expectedProject));
  if (!identity)
    throw new Error(`Identidade do banco inválida: ${expectedProject} não encontrada.`);
}
