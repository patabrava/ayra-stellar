import {
  ADVISOR_RESPONSE_JSON_SCHEMA,
  buildAdvisorPrompt,
  normalizeAdvisorAnswer,
  type AdvisorAnswer,
  type AdvisorSource,
} from "@/lib/ayra/advisor";

const GEMINI_GENERATE_CONTENT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash";

const AYRA_ADVISOR_SYSTEM_INSTRUCTION = [
  "You are AYRA's public AI advisor.",
  "Return only valid JSON that matches the provided schema.",
  "Use only the supplied AYRA public source facts.",
  "Never expose private contacts, raw receipt paths, payout addresses, failed payment details, or internal notes.",
].join(" ");

type GeminiTextPart = {
  text?: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiTextPart[];
    };
  }>;
};

export function hasGeminiEnv(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(env.GEMINI_API_KEY?.trim());
}

export function geminiModel(env: NodeJS.ProcessEnv = process.env) {
  return env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

export function geminiEndpoint(model: string) {
  return `${GEMINI_GENERATE_CONTENT_BASE}/${encodeURIComponent(model)}:generateContent`;
}

export function buildGeminiRequestBody(
  systemInstruction: string,
  prompt: string,
) {
  return {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: ADVISOR_RESPONSE_JSON_SCHEMA,
    },
  };
}

export function extractGeminiText(response: unknown) {
  const candidate = (response as GeminiResponse).candidates?.[0];
  const text = candidate?.content?.parts?.find(
    (part) => typeof part.text === "string" && part.text.trim().length > 0,
  )?.text;

  if (!text?.trim()) {
    throw new Error("Gemini response did not include candidate text.");
  }

  return text;
}

export async function generateGeminiAdvisorAnswer(
  question: string,
  sources: AdvisorSource[],
): Promise<AdvisorAnswer> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to generate an advisor answer.");
  }

  const prompt = buildAdvisorPrompt(question, sources);
  const response = await fetch(geminiEndpoint(geminiModel()), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(
      buildGeminiRequestBody(AYRA_ADVISOR_SYSTEM_INSTRUCTION, prompt),
    ),
  });

  if (!response.ok) {
    const body = await response.text();
    const redactedBody = body.replaceAll(apiKey, "[redacted]");
    const detail = redactedBody.trim() ? `: ${redactedBody.slice(0, 500)}` : "";
    throw new Error(
      `Gemini generateContent failed with ${response.status} ${response.statusText}${detail}`,
    );
  }

  const text = extractGeminiText(await response.json());
  return normalizeAdvisorAnswer(JSON.parse(text), sources);
}
