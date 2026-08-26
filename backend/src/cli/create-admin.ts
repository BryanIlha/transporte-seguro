import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import argon2 from "argon2";
import { eq } from "drizzle-orm";
import { assertDatabaseIdentity, createDatabase } from "../db/client.js";
import { adminUsers } from "../db/schema.js";

const { db, client } = createDatabase();
const rl = createInterface({ input, output });

async function main() {
  await assertDatabaseIdentity(db);
  const email = (process.env.ADMIN_EMAIL ?? (await rl.question("E-mail do administrador: ")))
    .trim()
    .toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD ?? (await rl.question("Senha (mínimo 12 caracteres): "));
  if (!email || password.length < 12) throw new Error("E-mail ou senha inválidos.");
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  const [existing] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email));
  if (existing) {
    await db
      .update(adminUsers)
      .set({ passwordHash, isActive: true, updatedAt: new Date() })
      .where(eq(adminUsers.id, existing.id));
  } else {
    await db.insert(adminUsers).values({ email, passwordHash });
  }
  console.log(`Administrador ${email} pronto.`);
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
