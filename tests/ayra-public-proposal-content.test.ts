import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PublicRichText } from "../src/components/ayra/public-rich-text";

function renderProposal(content: string) {
  return renderToStaticMarkup(createElement(PublicRichText, null, content));
}

describe("AYRA public proposal content", () => {
  it("turns proposal URLs into safe, readable links", () => {
    const html = renderProposal(
      "Review https://example.org/a-very-long-proposal-path?section=water and continue.",
    );

    assert.match(html, /href="https:\/\/example\.org\/a-very-long-proposal-path\?section=water"/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noreferrer noopener"/);
    assert.match(html, /class="public-rich-link"/);
  });

  it("preserves paragraphs and line breaks from long applications", () => {
    const html = renderProposal(
      "First paragraph.\nStill first paragraph.\n\nSecond paragraph.",
    );

    assert.equal((html.match(/<p/g) ?? []).length, 2);
    assert.match(html, /First paragraph\.<br\/>Still first paragraph\./);
    assert.match(html, /Second paragraph\./);
  });

  it("does not make unsupported protocols clickable", () => {
    const html = renderProposal(
      "Do not open javascript:alert(1) from proposal copy.",
    );

    assert.doesNotMatch(html, /href=/);
  });
});
