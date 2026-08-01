import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ProjectMediaError,
  privateProjectMediaPath,
  publicProjectMediaPath,
  validateProjectImage,
  validateProjectMediaFiles,
} from "../src/lib/ayra/project-media";

function png(width: number, height: number, type = "image/png") {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47], 0);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], "field.png", { type });
}

describe("AYRA project media", () => {
  it("accepts a genuine high-resolution main PNG", async () => {
    const result = await validateProjectImage(png(2400, 1350), "main");
    assert.deepEqual({ width: result.width, height: result.height, extension: result.extension }, { width: 2400, height: 1350, extension: "png" });
  });

  it("rejects MIME spoofing and undersized main images", async () => {
    await assert.rejects(() => validateProjectImage(png(2400, 1350, "image/jpeg"), "main"), (error: unknown) => error instanceof ProjectMediaError && error.code === "unsupported");
    await assert.rejects(() => validateProjectImage(png(1200, 800), "main"), (error: unknown) => error instanceof ProjectMediaError && error.code === "dimensions");
  });

  it("allows portrait gallery images that meet both side limits", async () => {
    const result = await validateProjectImage(png(900, 1400), "gallery");
    assert.equal(result.height, 1400);
  });

  it("limits gallery count and creates private/public generated paths", () => {
    assert.throws(() => validateProjectMediaFiles(png(2400, 1350), Array.from({ length: 9 }, () => png(1200, 800))), (error: unknown) => error instanceof ProjectMediaError && error.code === "too-many");
    assert.equal(privateProjectMediaPath("app", "media", "jpg"), "app/media.jpg");
    assert.equal(publicProjectMediaPath("initiative", "media", "webp"), "initiative/media.webp");
  });
});
