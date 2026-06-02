import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  Hash,
  StellarTransactionVerificationLink,
  StatusBannerForSurface,
} from "../src/components/ayra/ui";
import {
  BatchInitiativeTarget,
  type BatchInitiativeTargetOption,
} from "../src/components/ayra/batch-initiative-target";
import { UpdateMediaField } from "../src/components/ayra/update-media-field";

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

  it("names real Stellar transaction links for admin verification", () => {
    const txHash =
      "ef65b3c14e9bed2a6e1d4fc433755566d6d0753332bbdad028b45fdbfd48048d";
    const markup = renderToStaticMarkup(createElement(Hash, { value: txHash }));

    assert.match(
      markup,
      new RegExp(`aria-label="Open Stellar testnet transaction ${txHash}"`),
    );
    assert.match(markup, /title="Open on Stellar Expert"/);
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

  it("renders an explicit admin explorer verification URL for settled transactions", () => {
    const txHash =
      "ef65b3c14e9bed2a6e1d4fc433755566d6d0753332bbdad028b45fdbfd48048d";
    const markup = renderToStaticMarkup(
      createElement(StellarTransactionVerificationLink, { transactionHash: txHash }),
    );

    assert.match(markup, /Verify on Stellar Expert/);
    assert.match(
      markup,
      new RegExp(
        `href="https://stellar\\.expert/explorer/testnet/tx/${txHash}"`,
      ),
    );
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

describe("AYRA admin batch initiative target", () => {
  const targets: BatchInitiativeTargetOption[] = [
    {
      id: "initiative-reforest",
      name: "Reforestation",
      trackName: "Providencia",
      code: "AYRA-PVD-REFOREST",
      stewardName: "Leidy Mendoza",
      payoutAddress: "GBLEIDYECOPARQUEIRONWOODPROVIDENCIASTELLAR3RS9KQ4MWL2VTYGB7",
      payoutStatus: "locked",
    },
    {
      id: "initiative-sterilization",
      name: "Dog Sterilization",
      trackName: "Providencia",
      code: "AYRA-PVD-STERIL",
      stewardName: "Dr. M. Gomez",
      payoutAddress: null,
      payoutStatus: null,
    },
  ];

  it("renders the selected initiative and active payout destination in the batch composer", () => {
    const markup = renderToStaticMarkup(
      createElement(BatchInitiativeTarget, {
        defaultInitiativeId: "initiative-reforest",
        targets,
      }),
    );

    assert.match(markup, /name="initiativeId"/);
    assert.match(markup, /Reforestation/);
    assert.match(markup, /Providencia/);
    assert.match(markup, /AYRA-PVD-REFOREST/);
    assert.match(markup, /Leidy Mendoza/);
    assert.match(markup, /Active verified payout destination/);
    assert.match(markup, /GBLEIDYECOPARQUEIRONWOODPROVIDENCIASTELLAR3RS9KQ4MWL2VTYGB7/);
    assert.match(markup, /Dog Sterilization/);
    assert.match(markup, /No verified payout address/);
  });
});

describe("AYRA global clickable cursor", () => {
  it("uses the native hand cursor instead of the old leaf asset", () => {
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

    assert.match(css, /--action-cursor:\s*pointer;/);
    assert.doesNotMatch(css, /\/cursors\/ayra-sprout\.svg/);
  });
});

describe("AYRA steward media upload field", () => {
  it("renders the public media upload as a designed card, not a visible native file button", () => {
    const markup = renderToStaticMarkup(createElement(UpdateMediaField));

    assert.match(markup, /class="field upload-field"/);
    assert.match(markup, /class="upload-card"/);
    assert.match(markup, /class="upload-input"/);
    assert.match(markup, /Choose file/);
    assert.match(markup, /No file selected yet/);
  });

  it("keeps the steward update form on the shared media upload component", () => {
    const page = readFileSync(
      new URL("../src/app/steward/page.tsx", import.meta.url),
      "utf8",
    );

    assert.match(page, /<UpdateMediaField \/>/);
    assert.doesNotMatch(page, /<input\s+[^>]*name="mediaFile"[^>]*type="file"/s);
  });

  it("keeps a formatted fallback for any raw file inputs that are added later", () => {
    const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

    assert.match(css, /\.field input\[type="file"\]/);
    assert.match(css, /\.field input\[type="file"\]::file-selector-button/);
  });
});
