import { createReadStream } from "node:fs";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

export class FileStore {
  readonly root: string;

  constructor(root = process.env.FILE_ROOT ?? "/data") {
    this.root = resolve(root);
  }

  async init() {
    await mkdir(join(this.root, "public", "vehicles"), { recursive: true });
    await mkdir(join(this.root, "private", "vehicles"), { recursive: true });
  }

  imagePath(vehicleId: string, storageName: string) {
    return this.safePath("public", "vehicles", vehicleId, storageName);
  }

  documentPath(vehicleId: string, storageName: string) {
    return this.safePath("private", "vehicles", vehicleId, storageName);
  }

  private safePath(...parts: string[]) {
    const path = resolve(this.root, ...parts.map((part) => basename(part)));
    if (!path.startsWith(`${this.root}/`)) throw new Error("Caminho de arquivo inválido.");
    return path;
  }

  async saveImage(vehicleId: string, storageName: string, data: Buffer) {
    const path = this.imagePath(vehicleId, storageName);
    await mkdir(join(this.root, "public", "vehicles", vehicleId), { recursive: true });
    await writeFile(path, data, { flag: "wx", mode: 0o640 });
    return path;
  }

  async saveDocument(vehicleId: string, storageName: string, data: Buffer) {
    const path = this.documentPath(vehicleId, storageName);
    await mkdir(join(this.root, "private", "vehicles", vehicleId), { recursive: true });
    await writeFile(path, data, { flag: "wx", mode: 0o600 });
    return path;
  }

  readImage(vehicleId: string, storageName: string) {
    return createReadStream(this.imagePath(vehicleId, storageName));
  }

  readDocument(vehicleId: string, storageName: string) {
    return createReadStream(this.documentPath(vehicleId, storageName));
  }

  async removeImage(vehicleId: string, storageName: string) {
    await rm(this.imagePath(vehicleId, storageName), { force: true });
  }

  async removeDocument(vehicleId: string, storageName: string) {
    await rm(this.documentPath(vehicleId, storageName), { force: true });
  }

  async removeVehicle(vehicleId: string) {
    const publicPath = join(this.root, "public", "vehicles", basename(vehicleId));
    const privatePath = join(this.root, "private", "vehicles", basename(vehicleId));
    await rm(publicPath, { recursive: true, force: true });
    await rm(privatePath, { recursive: true, force: true });
  }

  async quarantineVehicle(vehicleId: string) {
    const quarantine = join(this.root, ".trash", `${basename(vehicleId)}-${Date.now()}`);
    await mkdir(join(this.root, ".trash"), { recursive: true });
    const publicPath = join(this.root, "public", "vehicles", basename(vehicleId));
    const privatePath = join(this.root, "private", "vehicles", basename(vehicleId));
    await mkdir(quarantine, { recursive: true });
    await Promise.all([
      rename(publicPath, join(quarantine, "public")).catch(() => undefined),
      rename(privatePath, join(quarantine, "private")).catch(() => undefined),
    ]);
    return quarantine;
  }

  async purgeQuarantine(path: string) {
    await rm(path, { recursive: true, force: true });
  }
}
