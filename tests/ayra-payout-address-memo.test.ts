import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA payout-address memos", () => {
  it("normalizes a Stellar memo and rejects values over 28 UTF-8 bytes", async () => {
    const memoModule = await import("../src/lib/ayra/payout-address").catch(() => null);
    assert.ok(memoModule, "payout-address memo validator should exist");

    assert.equal(memoModule.normalizeWalletAddressMemo(" 4192883277 "), "4192883277");
    assert.equal(memoModule.normalizeWalletAddressMemo("   "), undefined);
    assert.throws(
      () => memoModule.normalizeWalletAddressMemo("é".repeat(15)),
      /28 UTF-8 bytes/,
    );
  });

  it("persists and displays the optional memo in the role workflow", () => {
    const actionSource = readFileSync("src/lib/ayra/actions.ts", "utf8");
    const dataSource = readFileSync("src/lib/ayra/data.ts", "utf8");
    const stewardSource = readFileSync("src/app/steward/page.tsx", "utf8");
    const registrySource = readFileSync("src/app/admin/registry/page.tsx", "utf8");

    assert.match(actionSource, /walletAddressMemo: optionalText\(formData, "walletAddressMemo"\)/);
    assert.match(actionSource, /wallet_address_memo: walletAddressMemo \?\? null/);
    assert.match(dataSource, /address,wallet_address_memo,stellar_network,status/);
    assert.match(stewardSource, /name="walletAddressMemo"/);
    assert.match(registrySource, /address\.walletAddressMemo/);
  });

  it("passes the stored memo through both SDP destination loaders", () => {
    for (const path of ["src/lib/ayra/actions.ts", "src/lib/ayra/batch-sync.ts"]) {
      const source = readFileSync(path, "utf8");
      assert.match(source, /select\("address,wallet_address_memo"\)/, path);
      assert.match(
        source,
        /walletAddressMemo: address\.wallet_address_memo \?\? null/,
        path,
      );
    }
  });
});
