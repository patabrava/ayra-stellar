import { NextResponse } from "next/server";

import {
  advisorRequestSchema,
  buildAdvisorSources,
  fallbackAdvisorAnswer,
} from "@/lib/ayra/advisor";
import { loadPublicAyraState } from "@/lib/ayra/data";
import {
  generateGeminiAdvisorAnswer,
  hasGeminiEnv,
} from "@/lib/ayra/gemini";

type AdvisorMode = "deterministic-fallback" | "gemini";

function advisorJson(
  body: ReturnType<typeof fallbackAdvisorAnswer> & { mode: AdvisorMode },
) {
  return NextResponse.json(body);
}

function advisorError(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return advisorError(
      "advisor_invalid_json",
      "Advisor request body must be valid JSON.",
      400,
    );
  }

  const parsed = advisorRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return advisorError(
      "advisor_invalid_request",
      "Advisor request must include a valid question.",
      400,
    );
  }

  const state = await loadPublicAyraState();
  const sources = buildAdvisorSources(state, parsed.data.route ?? {});

  if (!hasGeminiEnv()) {
    return advisorJson({
      ...fallbackAdvisorAnswer(parsed.data.question, sources),
      mode: "deterministic-fallback",
    });
  }

  try {
    return advisorJson({
      ...(await generateGeminiAdvisorAnswer(parsed.data.question, sources)),
      mode: "gemini",
    });
  } catch {
    console.error("AYRA advisor Gemini generation failed; using fallback.");
    return advisorJson({
      ...fallbackAdvisorAnswer(parsed.data.question, sources),
      mode: "deterministic-fallback",
    });
  }
}
