import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { Hash, StatusBannerForSurface } from "../src/components/ayra/ui";

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

  it("hides placeholder provider references from the UI", () => {
    const markup = renderToStaticMarkup(
      createElement(Hash, { value: "mock-payment-apr-3" }),
    );

    assert.match(markup, /^<span /);
    assert.doesNotMatch(markup, /href=/);
    assert.doesNotMatch(markup, /mock-payment-apr-3/);
    assert.match(markup, /Reference pending/);
  });
});

describe("AYRA journey status banner", () => {
  it("renders application approval confirmation with next steps", () => {
    const markup = renderToStaticMarkup(
      createElement(StatusBannerForSurface, {
        status: "application-approved",
        surface: "admin",
      }),
    );

    assert.match(markup, /Application approved\./);
    assert.match(markup, /Steward access is active/);
    assert.match(markup, /Next step: the steward submits the first Stellar payout address/);
    assert.match(markup, /No funding batch can be created until that address is verified/);
  });
});
