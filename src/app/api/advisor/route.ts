import { NextResponse } from "next/server";

import {
  advisorRequestSchema,
  buildAdvisorSources,
  fallbackAdvisorAnswer,
  isApprovedProjectsQuestion,
  loadStoredAdvisorSources,
  mergeAdvisorSources,
  selectAdvisorSourcesForQuestion,
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
  const runtimeSources = buildAdvisorSources(state, parsed.data.route ?? {});
  const storedSources = await loadStoredAdvisorSources();
  const sources = mergeAdvisorSources(storedSources, runtimeSources);
  const retrievalSources = selectAdvisorSourcesForQuestion(
    parsed.data.question,
    sources,
    parsed.data.route ?? {},
    parsed.data.question.split(/\s+/).length > 10 ? 18 : 12,
  );
  const fallbackAnswer = fallbackAdvisorAnswer(parsed.data.question, sources);

  if (isApprovedProjectsQuestion(parsed.data.question)) {
    return advisorJson({
      ...fallbackAnswer,
      mode: "deterministic-fallback",
    });
  }

  if (!hasGeminiEnv()) {
    return advisorJson({
      ...fallbackAnswer,
      mode: "deterministic-fallback",
    });
  }

  try {
    const geminiAnswer = await generateGeminiAdvisorAnswer(
      parsed.data.question,
      retrievalSources,
      parsed.data.history ?? [],
    );
    if (
      geminiAnswer.status === "grounded_decline" &&
      fallbackAnswer.status === "answered"
    ) {
      return advisorJson({
        ...fallbackAnswer,
        mode: "deterministic-fallback",
      });
    }

    return advisorJson({
      ...geminiAnswer,
      mode: "gemini",
    });
  } catch (error) {
    console.error(
      "AYRA advisor Gemini generation failed; using fallback.",
      error instanceof Error ? error.message : "Unknown error",
    );
    return advisorJson({
      ...fallbackAnswer,
      mode: "deterministic-fallback",
    });
  }
}
