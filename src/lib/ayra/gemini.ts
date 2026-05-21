import {
  ADVISOR_RESPONSE_JSON_SCHEMA,
  type AdvisorAnswer,
  type AdvisorConversationTurn,
  type AdvisorSource,
  buildAdvisorPrompt,
  normalizeAdvisorAnswer,
} from "@/lib/ayra/advisor";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export function hasGeminiEnv() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateGeminiAdvisorAnswer(
  question: string,
  sources: AdvisorSource[],
  history: AdvisorConversationTurn[] = [],
): Promise<AdvisorAnswer> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const prompt = buildAdvisorPrompt(question, sources, history);
  const response = await fetch(
    geminiEndpoint(GEMINI_MODEL),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(
        buildGeminiRequestBody(
          "Answer with JSON that matches the configured schema.",
          prompt,
        ),
      ),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini advisor request failed with HTTP ${response.status}.`);
  }

  const body = (await response.json()) as GeminiGenerateContentResponse;
  const text = extractGeminiText(body);
  if (!text) {
    throw new Error("Gemini advisor response did not include text.");
  }

  return normalizeAdvisorAnswer(JSON.parse(text), sources);
}

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
};

export function geminiEndpoint(model: string) {
  return `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;
}

export function buildGeminiRequestBody(system: string, prompt: string) {
  return {
    systemInstruction: {
      parts: [{ text: system }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: ADVISOR_RESPONSE_JSON_SCHEMA,
      temperature: 0.2,
    },
  };
}

export function extractGeminiText(response: GeminiGenerateContentResponse) {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      if (typeof part.text === "string" && part.text.trim()) {
        return part.text;
      }
    }
  }

  return "";
}
