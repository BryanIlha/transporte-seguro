import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FileStore } from "./file-store.js";

describe("FileStore", () => {
  it("separa fotos públicas de CRLV privado", async () => {
    const root = await mkdtemp(join(tmpdir(), "transporte-seguro-"));
    const store = new FileStore(root);
    await store.init();
    await store.saveImage("vehicle-1", "photo.jpg", Buffer.from("image"));
    await store.saveDocument("vehicle-1", "crlv.pdf", Buffer.from("%PDF-test"));

    expect(await readFile(join(root, "public/vehicles/vehicle-1/photo.jpg"), "utf8")).toBe("image");
    expect(await readFile(join(root, "private/vehicles/vehicle-1/crlv.pdf"), "utf8")).toBe(
      "%PDF-test",
    );
    await rm(root, { recursive: true, force: true });
  });
});
