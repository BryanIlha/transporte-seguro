import { test, expect } from "@playwright/test";

test("administra um veículo e o publica no catálogo", async ({ page }) => {
  test.skip(
    !process.env.E2E_ADMIN_EMAIL || !process.env.E2E_ADMIN_PASSWORD,
    "Configure E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD para executar o E2E contra um ambiente dedicado.",
  );

  await page.goto("/admin");
  await page.getByLabel("E-mail").fill(process.env.E2E_ADMIN_EMAIL!);
  await page.getByLabel("Senha").fill(process.env.E2E_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: /entrar/i }).click();
  await expect(page.getByText("Administrar catálogo")).toBeVisible();

  await page.getByRole("button", { name: /novo veículo/i }).click();
  await page.getByLabel("Título").fill("Veículo E2E");
  await page.getByLabel("Categoria").fill("Fretamento");
  await page.getByRole("button", { name: /salvar veículo/i }).click();
  await expect(page.getByText("Veículo cadastrado.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Veículo E2E")).toBeVisible();
});
