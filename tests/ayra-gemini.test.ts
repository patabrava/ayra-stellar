import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGeminiRequestBody,
  extractGeminiText,
  geminiEndpoint,
} from "../src/lib/ayra/gemini";

describe("AYRA Gemini REST boundary", () => {
  it("builds JSON-only Gemini request bodies without secrets", () => {
    const body = buildGeminiRequestBody("system", "prompt");
    const serialized = JSON.stringify(body);

    assert.equal(body.systemInstruction.parts[0]?.text, "system");
    assert.equal(body.contents[0]?.parts[0]?.text, "prompt");
    assert.equal(
      body.generationConfig.responseMimeType,
      "application/json",
    );
    assert.ok(body.generationConfig.responseSchema);
    assert.equal("responseFormat" in body.generationConfig, false);
    assert.doesNotMatch(serialized, /additionalProperties/);
    assert.doesNotMatch(serialized, /GEMINI_API_KEY/);
  });

  it("builds Gemini generateContent endpoints without API keys", () => {
    assert.equal(
      geminiEndpoint("gemini-3.5-flash"),
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
    );
  });

  it("extracts candidate JSON text", () => {
    assert.equal(
      extractGeminiText({
        candidates: [
          {
            content: {
              parts: [{ text: '{"answer":"ok"}' }],
            },
          },
        ],
      }),
      '{"answer":"ok"}',
    );
  });
});
