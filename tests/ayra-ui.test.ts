import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Hash } from "../src/components/ayra/ui";

describe("AYRA UI hash renderer", () => {
  it("links real Stellar transaction hashes to Stellar Expert testnet", () => {
    const txHash =
      "ef65b3c14e9bed2a6e1d4fc433755566d6d0753332bbdad028b45fdbfd48048d";
    const markup = renderToStaticMarkup(createElement(Hash, { value: txHash }));

    assert.match(markup, /^<a /);
    assert.match(
      markup,
      new RegExp(
        `href="https://stellar\\.expert/explorer/testnet/tx/${txHash}"`,
      ),
    );
    assert.match(markup, /target="_blank"/);
    assert.match(markup, /rel="noopener noreferrer"/);
  });

  it("keeps non-transaction references as plain hashes", () => {
    const markup = renderToStaticMarkup(
      createElement(Hash, { value: "mock-payment-apr-3" }),
    );

    assert.match(markup, /^<span /);
    assert.doesNotMatch(markup, /href=/);
  });
});
