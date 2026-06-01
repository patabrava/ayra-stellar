import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PrivacyPage from "../src/app/privacy/page";
import { SiteFooter } from "../src/components/ayra/site-footer";
import { PUBLIC_CONTACT_EMAIL } from "../src/lib/ayra/contact";

describe("AYRA public contact email", () => {
  it("renders the public contact email in the footer", () => {
    const markup = renderToStaticMarkup(createElement(SiteFooter));

    assert.ok(markup.includes(`mailto:${PUBLIC_CONTACT_EMAIL}`));
    assert.ok(markup.includes(PUBLIC_CONTACT_EMAIL));
    assert.ok(!markup.includes("contact@ayra.haus"));
  });

  it("renders the public contact email on the privacy page", () => {
    const markup = renderToStaticMarkup(createElement(PrivacyPage));

    assert.ok(markup.includes(`mailto:${PUBLIC_CONTACT_EMAIL}`));
    assert.ok(markup.includes(PUBLIC_CONTACT_EMAIL));
    assert.ok(!markup.includes("contact@ayra.haus"));
  });
});
