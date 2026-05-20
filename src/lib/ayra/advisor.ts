import { z } from "zod";

import {
  formatUsdc,
  getPublicInitiativeProjection,
  getPublicWallProjection,
  type AyraState,
  type BatchStatus,
} from "@/lib/ayra/domain";

export type AdvisorRouteContext = {
  trackSlug?: string;
  initiativeSlug?: string;
};

export type AdvisorSource = {
  id: string;
  title: string;
  href?: string;
  trackSlug?: string;
  initiativeSlug?: string;
  content: string;
};

export type AdvisorCitation = {
  sourceId: string;
  label: string;
  href?: string;
};

export type AdvisorAnswer = {
  answer: string;
  citations: AdvisorCitation[];
  followups: string[];
  status: "answered" | "grounded_decline";
};

export const advisorRequestSchema = z
  .object({
    question: z.string().trim().min(3).max(600),
    route: z
      .object({
        trackSlug: z.string().trim().min(1).max(80).optional(),
        initiativeSlug: z.string().trim().min(1).max(80).optional(),
      })
      .strict()
      .optional(),
    history: z
      .array(
        z
          .object({
            role: z.enum(["user", "advisor"]),
            text: z.string().trim().min(1).max(1200),
          })
          .strict(),
      )
      .max(6)
      .optional(),
  })
  .strict();

const rawAdvisorAnswerSchema = z
  .object({
    answer: z.string().trim().min(1).max(1800),
    citations: z
      .array(
        z
          .object({
            sourceId: z.string().trim().min(1).max(180),
            label: z.string().trim().min(1).max(120),
          })
          .strict(),
      )
      .max(6),
    followups: z.array(z.string().trim().min(1).max(120)).max(4),
    status: z.enum(["answered", "grounded_decline"]),
  })
  .strict();

export const ADVISOR_RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "A concise public answer grounded only in provided AYRA source facts.",
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          sourceId: {
            type: "string",
            description: "A source ID copied exactly from the source pack.",
          },
          label: {
            type: "string",
            description: "Short citation label shown as a chip.",
          },
        },
        required: ["sourceId", "label"],
      },
    },
    followups: {
      type: "array",
      items: { type: "string" },
      description: "Short suggested next questions.",
    },
    status: {
      type: "string",
      enum: ["answered", "grounded_decline"],
      description: "Use grounded_decline when sources do not support an answer.",
    },
  },
  required: ["answer", "citations", "followups", "status"],
} as const;

const privateContentPatterns = [
  /receipts\//i,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\+\d{1,3}[\s.-]?\d{3}[\d\s.-]{4,}/,
  /\bG[A-Z0-9]{20,}\b/,
  /\bprofile-[a-z0-9-]+\b/i,
] as const;

function hasPrivateContent(input: string) {
  return privateContentPatterns.some((pattern) => pattern.test(input));
}

function publicSource(input: AdvisorSource): AdvisorSource {
  if (hasPrivateContent(input.content)) {
    throw new Error(`Advisor source contains private-looking content: ${input.id}`);
  }
  return input;
}

function plainNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

function publicBatchLabel(status: BatchStatus) {
  return status === "settled" ? "Cleared" : "In flight";
}

export function buildAdvisorSources(
  state: AyraState,
  route: AdvisorRouteContext = {},
): AdvisorSource[] {
  const preferredTrackSlug =
    state.tracks.find((track) => track.slug === route.trackSlug)?.slug ??
    state.tracks[0]?.slug;

  const sources: AdvisorSource[] = [
    publicSource({
      id: "ayra:public-boundary",
      title: "AYRA public proof boundary",
      href: "/privacy",
      content:
        "AYRA public surfaces show approved updates, project summaries, category-level spend, submitted or settled public batches, and proof links. AYRA public surfaces exclude contact data, file storage paths, wallet destinations, unsuccessful payment details, and operator-only reconciliation records.",
    }),
    publicSource({
      id: "ayra:payment-language",
      title: "AYRA payment language",
      content:
        "AYRA public payment labels use In flight for submitted batches and Cleared for settled batches. Funding numbers must come from public batch and line-item totals, not estimates.",
    }),
    publicSource({
      id: "stellar:trace-rules",
      title: "Stellar trace rules",
      href: "/proof/batch-reforest-mar26",
      content:
        "Transaction hashes are public ledger references that help people trace a payment from the advisor, the proof pack, and the public project page into the Stellar explorer. A grantee should ask where the hash is shown, which proof pack it belongs to, and whether the batch is In flight or Cleared. Do not invent hidden recipient routing.",
    }),
  ];

  for (const track of state.tracks) {
    const wall = getPublicWallProjection(state, track.slug);
    sources.push(
      publicSource({
        id: `track:${track.slug}`,
        title: `Track - ${track.name}`,
        href: `/?track=${track.slug}`,
        trackSlug: track.slug,
        content: `${track.name} is an AYRA track with ${wall.initiatives.length} public initiative(s). Local currency for local snapshots is ${track.localCurrency}. The public track theme is ${track.theme}.`,
      }),
    );

    for (const initiative of wall.initiatives) {
      const project = getPublicInitiativeProjection(
        state,
        track.slug,
        initiative.slug,
      );
      const visibleTotal = project.batches.reduce(
        (sum, batch) => sum + batch.amountUsdc,
        0,
      );
      const settledTotal = project.batches
        .filter((batch) => batch.status === "settled")
        .reduce((sum, batch) => sum + batch.amountUsdc, 0);
      const inFlightTotal = project.batches
        .filter((batch) => batch.status === "submitted")
        .reduce((sum, batch) => sum + batch.amountUsdc, 0);
      const batchSummary =
        project.batches
          .map(
            (batch) =>
              `${batch.periodLabel}: ${formatUsdc(batch.amountUsdc)} ${publicBatchLabel(batch.status)}`,
          )
          .join("; ") || "No submitted or settled public batches yet.";
      const categorySummary =
        project.spending
          .map((item) => `${item.category}: ${formatUsdc(item.amountUsdc)}`)
          .join("; ") || "No public category spend yet.";

      sources.push(
        publicSource({
          id: `project:${track.slug}:${initiative.slug}`,
          title: `Project - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} is an AYRA project in ${track.name}. Headline: ${initiative.headline}. Description: ${initiative.description}. Public steward name: ${initiative.stewardName ?? "not published"}. Progress: ${plainNumber(initiative.targetMetricCurrent)} of ${plainNumber(initiative.targetMetricGoal)} ${initiative.targetMetricLabel}. League score: ${initiative.leagueScore} of 99. Status: ${initiative.status}.`,
        }),
        publicSource({
          id: `funding:${track.slug}:${initiative.slug}`,
          title: `Funding - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} funding in ${track.name}. Visible batch volume: ${formatUsdc(visibleTotal)}. Settled total: ${formatUsdc(settledTotal)}. In flight total: ${formatUsdc(inFlightTotal)}. Public batches: ${batchSummary}. Public category spend: ${categorySummary}.`,
        }),
        publicSource({
          id: `stellar:${track.slug}:${initiative.slug}`,
          title: `Stellar trace - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} Stellar tracing in ${track.name}. Transaction hashes are public references that can be watched from the proof pack or public project page. The hash identifies a payment record, the proof pack shows the batch context, and the Stellar explorer is the final public check for the chain record. Grantees can ask which batch the hash belongs to, whether the payment is In flight or Cleared, and where the proof link resolves.`,
        }),
      );

      for (const batch of project.batches) {
        sources.push(
          publicSource({
            id: `proof:${batch.id}`,
            title: `Proof - ${batch.code}`,
            href: `/proof/${batch.id}`,
            trackSlug: track.slug,
            initiativeSlug: initiative.slug,
            content: `${batch.code} is a public proof batch for ${initiative.name}. Period: ${batch.periodLabel}. Amount: ${formatUsdc(batch.amountUsdc)}. Public status: ${publicBatchLabel(batch.status)}. Sponsor: ${batch.sponsorName ?? "not published"}.`,
          }),
        );
      }
    }
  }

  return prioritizeSources(sources, {
    trackSlug: preferredTrackSlug,
    initiativeSlug: route.initiativeSlug,
  });
}

export function buildAdvisorPrompt(question: string, sources: AdvisorSource[]) {
  const sourcePack = sources
    .slice(0, 18)
    .map(
      (item) =>
        `SOURCE ID: ${item.id}\nTITLE: ${item.title}\nHREF: ${item.href ?? ""}\nFACTS: ${item.content}`,
    )
    .join("\n\n");

  return [
    "You are the AYRA public advisor embedded in the transparency app.",
    "Answer only from the source pack below.",
    "Do not reveal private contacts, emails, phone numbers, payout addresses, raw receipt paths, failed payment details, or internal reconciliation notes.",
    "For funding questions, answer exact public totals when the source pack provides them. Use the terms Cleared and In flight.",
    "Explain transaction hashes in plain public language: how to watch them, what they do, where they resolve, and which proof pack or explorer page to open.",
    "If the sources do not support the answer, set status to grounded_decline and say what public page to inspect instead.",
    "Every answered response must cite one to three source IDs copied exactly from the source pack.",
    "",
    sourcePack,
    "",
    `Question: ${question}`,
  ].join("\n");
}

export function normalizeAdvisorAnswer(
  input: unknown,
  sources: AdvisorSource[],
): AdvisorAnswer {
  const parsed = rawAdvisorAnswerSchema.safeParse(input);
  if (!parsed.success) {
    return groundedDecline("I could not verify that answer against AYRA public sources.");
  }

  if (hasPrivateContent(parsed.data.answer)) {
    return groundedDecline("I cannot share private AYRA operational details.");
  }

  const sourcesById = new Map(sources.map((item) => [item.id, item]));
  const citations = parsed.data.citations
    .filter((citation) => sourcesById.has(citation.sourceId))
    .slice(0, 3)
    .map((citation) => ({
      ...citation,
      href: sourcesById.get(citation.sourceId)?.href,
    }));

  if (parsed.data.status === "answered" && citations.length === 0) {
    return groundedDecline("I need a public AYRA source before I can answer that.");
  }

  return {
    answer: parsed.data.answer,
    citations,
    followups: parsed.data.followups.slice(0, 4),
    status: parsed.data.status,
  };
}

export function fallbackAdvisorAnswer(
  question: string,
  sources: AdvisorSource[],
): AdvisorAnswer {
  const loweredQuestion = question.toLowerCase();
  const asksFunding =
    /\b(paid|settled|cleared|funded|funding|money|amount|batch|sponsor)\b/.test(
      loweredQuestion,
    );
  const asksStellar =
    /\b(stellar|transaction hash|tx hash|hash|ledger|explorer|watch|trace|payment track|where can it go)\b/.test(
      loweredQuestion,
    );
  const fundingSource =
    sources.find((item) => item.id.startsWith("funding:")) ??
    sources.find((item) => item.id === "ayra:payment-language");
  const stellarSource =
    sources.find((item) => item.id.startsWith("stellar:")) ??
    sources.find((item) => item.id === "stellar:trace-rules");

  if (asksFunding && fundingSource) {
    return {
      answer: fundingSource.content,
      citations: [
        {
          sourceId: fundingSource.id,
          label: fundingSource.title,
          href: fundingSource.href,
        },
      ],
      followups: [
        "Show me the proof pack",
        "Which batches are cleared?",
        "What does In flight mean?",
      ],
      status: "answered",
    };
  }

  if (asksStellar && stellarSource) {
    return {
      answer: stellarSource.content,
      citations: [
        {
          sourceId: stellarSource.id,
          label: stellarSource.title,
          href: stellarSource.href,
        },
      ],
      followups: [
        "Show me the proof pack",
        "Which batch does this hash belong to?",
        "Is this payment Cleared or In flight?",
      ],
      status: "answered",
    };
  }

  return groundedDecline(
    "I can answer from AYRA public proof, project, funding, and Stellar trace records once public sources support the question.",
  );
}

function prioritizeSources(
  sources: AdvisorSource[],
  route: AdvisorRouteContext,
) {
  return [...sources].sort((a, b) => {
    const scoreDiff = scoreSource(b, route) - scoreSource(a, route);
    return scoreDiff === 0 ? a.id.localeCompare(b.id) : scoreDiff;
  });
}

function scoreSource(sourceItem: AdvisorSource, route: AdvisorRouteContext) {
  let score = 0;
  if (sourceItem.trackSlug && sourceItem.trackSlug === route.trackSlug) score += 4;
  if (
    sourceItem.initiativeSlug &&
    sourceItem.initiativeSlug === route.initiativeSlug
  ) {
    score += 8;
  }
  if (sourceItem.id.startsWith("funding:")) score += 2;
  if (sourceItem.id.startsWith("stellar:")) score += 2;
  if (sourceItem.id === "ayra:public-boundary") score += 1;
  return score;
}

function groundedDecline(answer: string): AdvisorAnswer {
  return {
    answer,
    citations: [],
    followups: [
      "What is AYRA funding?",
      "How do public proof packs work?",
      "How do I become a sponsor?",
      "How do I watch a transaction hash?",
    ],
    status: "grounded_decline",
  };
}
