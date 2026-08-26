import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { eq } from "drizzle-orm";
import { assertDatabaseIdentity, createDatabase } from "../db/client.js";
import { adminUsers } from "../db/schema.js";

const { db, client } = createDatabase();
const rl = createInterface({ input, output });

async function main() {
  await assertDatabaseIdentity(db);
  const email = (
    process.env.ADMIN_EMAIL ?? (await rl.question("E-mail do administrador a remover: "))
  )
    .trim()
    .toLowerCase();
  if (!email) throw new Error("E-mail inválido.");
  const result = await db.delete(adminUsers).where(eq(adminUsers.email, email));
  console.log(`Administrador ${email} removido, se existia.`);
  return result;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    rl.close();
    void client.end({ timeout: 5 });
  });
