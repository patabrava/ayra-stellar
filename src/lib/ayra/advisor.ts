import { createHash } from "node:crypto";

import { z } from "zod";

import {
  createPublicSupabaseClient,
  hasPublicSupabaseEnv,
} from "@/lib/ayra/data";
import {
  formatUsdc,
  getPublicInitiativeProjection,
  getPublicWallProjection,
  type Initiative,
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

export type AdvisorSourceRow = AdvisorSource & {
  contentHash: string;
  embedding: string[];
  sourceKind: "generated" | "synced";
  syncedAt: string;
};

export type AdvisorCitation = {
  sourceId: string;
  label: string;
  href?: string;
};

export type AdvisorConversationTurn = {
  role: "user" | "advisor";
  text: string;
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

const advisorStopWords = new Set([
  "a",
  "about",
  "after",
  "all",
  "and",
  "are",
  "as",
  "at",
  "be",
  "been",
  "but",
  "by",
  "for",
  "from",
  "how",
  "i",
  "if",
  "in",
  "is",
  "it",
  "list",
  "me",
  "of",
  "on",
  "or",
  "public",
  "show",
  "that",
  "the",
  "this",
  "to",
  "what",
  "which",
  "who",
  "why",
  "with",
  "would",
  "can",
  "could",
  "have",
  "has",
  "haste",
  "does",
  "do",
  "done",
  "list",
  "active",
  "approved",
  "funded",
  "funding",
  "live",
]);

const ayraWebsiteSources = [
  publicSource({
    id: "ayra:north-star",
    title: "AYRA North Star",
    href: "https://www.ayra.haus/",
    content:
      "AYRA builds impact zones in places the team cares about. Season 1 starts in Providencia, in the Caribbean of Colombia, as a real-life technology sandbox that brings the island onto practical tech rails. The public story is place-first: local partners, local students, artists, digital nomads, and companies test real adoption in the field instead of only announcing ideas.",
  }),
  publicSource({
    id: "ayra:studio-model",
    title: "AYRA Studio model",
    href: "https://www.ayra.haus/",
    content:
      "An AYRA Studio is a sponsored adoption sandbox in Providencia: one company, one vertical, three teams, up to nine local student fellows, one 100-point scorecard, one winner, and one continuation path. A sponsor backs one Studio with a 37,500 EUR hard cap. The teams push adoption of real products, stacks, and systems with local partners, while selected artists turn the work into stories, films, exhibitions, and public moments.",
  }),
  publicSource({
    id: "ayra:season-timeline",
    title: "AYRA Season 1 timeline",
    href: "https://www.ayra.haus/",
    content:
      "AYRA Season 1 has three public phases. Espacios runs from September 2026 through January 2027 across Berlin, Barcelona, Hong Kong, NYC, and Bogota, revealing all seven Studios. Providencia runs from February through April 2027 as a three-month residency where teams ship with local partners alongside students, artists, and digital nomads. Cartagena follows in late April or May 2027 as a three-day finale with winners, Season Awards, films, exhibitions, performances, and distribution.",
  }),
  publicSource({
    id: "ayra:studio-sponsor",
    title: "AYRA Studio sponsorship",
    href: "https://www.ayra.haus/",
    content:
      "A sponsor reserves one Studio by choosing one vertical, then sending or selecting three teams to build adoption in Providencia. The 37,500 EUR hard cap backs the vertical, the three teams moving through Season 1, up to nine local student fellows, the 100-point scorecard, the winner selection, a sponsor report, and the Cartagena finale. The budget position is hard-capped, transparent, and published monthly.",
  }),
  publicSource({
    id: "ayra:verticals",
    title: "AYRA Season 1 verticals",
    href: "https://www.ayra.haus/",
    content:
      "AYRA Season 1 lists seven verticals: Regenerative Life for reef, mangrove, land, biodiversity, and food; Robotics and Physical Systems for drones, sensors, automation, and physical operations; Payments and Local Commerce for wallets, merchants, ticketing, and payouts; Culture and Identity for heritage, stories, music, and creators; Learning and Human Development for schools, skills, language, craft, and mentorship; Civic and Public Systems for governance, public services, and safety; and Compute and Agents for local compute, AI agents, and data infrastructure.",
  }),
  publicSource({
    id: "ayra:traction",
    title: "AYRA ground traction",
    href: "https://www.ayra.haus/",
    content:
      "The AYRA north-star material names two proof points for why the model can work on the ground. VIIO, AYRA's on-chain payments partner, operates in production as a B2SME wallet with regulated infrastructure partners and reported performance including 326M USD total payment volume, 650 active SME accounts, 11,900 operations, and an average transaction size around 27K USD. Providencia impact traction through Climate Future includes about 1,500 trees and shrubs planted, more than 420 children engaged across schools, animal welfare programs with about 30 dogs and 50 cats adopted, and about 95 percent of known street dogs regularly supported or adopted.",
  }),
] satisfies AdvisorSource[];

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

export function isApprovedProjectsQuestion(question: string) {
  const lowered = question.toLowerCase();
  return (
    /\b(public approval list|approval list|approved projects?|active projects?|live projects?|funded projects?|active initiatives?|live initiatives?|funded initiatives?|active programs?|live programs?|funded programs?)\b/.test(
      lowered,
    ) ||
    (/\b(projects?|initiatives?|programs?)\b/.test(lowered) &&
      /\b(approved|active|live|funded|funding)\b/.test(lowered))
  );
}

function isPubliclyApprovedInitiative(initiative: Pick<Initiative, "status">) {
  return initiative.status === "live" || initiative.status === "funding";
}

function buildApprovedProjectsContent(state: AyraState) {
  const trackSummaries = state.tracks
    .map((track) => {
      const approvedInitiatives = state.initiatives
        .filter(
          (initiative) =>
            initiative.trackId === track.id &&
            isPubliclyApprovedInitiative(initiative),
        )
        .map((initiative) => `${initiative.name} (${initiative.status})`);

      if (approvedInitiatives.length === 0) return null;
      return `${track.name}: ${approvedInitiatives.join(", ")}`;
    })
    .filter((value): value is string => value !== null);

  return [
    "AYRA public approval states are live and funding.",
    trackSummaries.length > 0
      ? `Publicly approved and active projects: ${trackSummaries.join("; ")}.`
      : "No publicly approved or active projects are listed yet.",
    "Draft initiatives are not public yet.",
  ].join(" ");
}

export function buildAdvisorSources(
  state: AyraState,
  route: AdvisorRouteContext = {},
): AdvisorSource[] {
  const preferredTrackSlug =
    state.tracks.find((track) => track.slug === route.trackSlug)?.slug ??
    state.tracks[0]?.slug;

  const sources: AdvisorSource[] = [
    ...ayraWebsiteSources,
    publicSource({
      id: "ayra:public-boundary",
      title: "AYRA public proof boundary",
      href: "/privacy",
      content:
        "AYRA public surfaces show approved updates, project summaries, category-level spend, submitted or settled public payments, and proof links. AYRA public surfaces exclude contact data, file storage paths, wallet destinations, unsuccessful payment details, and operator-only reconciliation records.",
    }),
    publicSource({
      id: "ayra:apply-flow",
      title: "AYRA application flow",
      href: "/apply",
      content:
        "People apply to manage an AYRA track initiative from /apply. The application form asks for applicant name, email, track, initiative, scope, operational details, milestones, and Signal or phone. The applicant submits with Submit for review. AYRA then reviews the proposed track, initiative scope, and operational contact model before granting portal access. If approved, the steward portal asks for the first Stellar payout address before any funding payment can be created. Funding approval and payout execution remain separate admin-controlled steps.",
    }),
    publicSource({
      id: "ayra:login-flow",
      title: "AYRA login flow",
      href: "/login",
      content:
        "People sign in to AYRA Stellar from /login. They can continue with Google or request a magic link by email. Login uses AYRA's role-aware callback before opening admin or steward access. Access is granted by live profile and role records, not by the sign-in method alone. Users should use the email connected to their application or operator role. Unknown emails are asked to submit an application first or use the approved admin email.",
    }),
    publicSource({
      id: "ayra:portal-access",
      title: "AYRA admin and steward access",
      href: "/login",
      content:
        "AYRA admin and steward portals are scoped access surfaces. Admin review covers applications, proposal approval or rejection, role promotion, payout-address verification, update moderation, and payment actions. Approved applicants can receive steward portal access for their scoped initiative. In the steward portal, a steward can submit public updates and submit the first Stellar payout address for AYRA verification. No funding payment can be created until the payout address is verified and locked.",
    }),
    publicSource({
      id: "ayra:payment-language",
      title: "AYRA payment language",
      content:
        "AYRA public payment labels use In flight for submitted payments and Cleared for settled payments. Funding numbers must come from public payment and line-item totals, not estimates.",
    }),
    publicSource({
      id: "ayra:approved-projects",
      title: "AYRA approved projects",
      content: buildApprovedProjectsContent(state),
    }),
    publicSource({
      id: "stellar:trace-rules",
      title: "Stellar trace rules",
      href: "/proof/batch-reforest-mar26",
      content:
        "Transaction hashes are public ledger references that help people trace a payment from the advisor, the proof pack, and the public project page into the Stellar explorer. A grantee should ask where the hash is shown, which proof pack it belongs to, and whether the payment is In flight or Cleared. Do not invent hidden recipient routing.",
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
          .join("; ") || "No submitted or settled public payments yet.";
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
          content: `${initiative.name} funding in ${track.name}. Visible payment volume: ${formatUsdc(visibleTotal)}. Settled total: ${formatUsdc(settledTotal)}. In flight total: ${formatUsdc(inFlightTotal)}. Public payments: ${batchSummary}. Public category spend: ${categorySummary}.`,
        }),
        publicSource({
          id: `stellar:${track.slug}:${initiative.slug}`,
          title: `Stellar trace - ${initiative.name}`,
          href: `/projects/${track.slug}/${initiative.slug}`,
          trackSlug: track.slug,
          initiativeSlug: initiative.slug,
          content: `${initiative.name} Stellar tracing in ${track.name}. Transaction hashes are public references that can be watched from the proof pack or public project page. The hash identifies a payment record, the proof pack shows the payment context, and the Stellar explorer is the final public check for the chain record. Grantees can ask which payment the hash belongs to, whether the payment is In flight or Cleared, and where the proof link resolves.`,
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
            content: `${batch.code} is a public proof payment for ${initiative.name}. Period: ${batch.periodLabel}. Amount: ${formatUsdc(batch.amountUsdc)}. Public status: ${publicBatchLabel(batch.status)}. Sponsor: ${batch.sponsorName ?? "not published"}.`,
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

export function buildAdvisorSourceRows(
  state: AyraState,
  route: AdvisorRouteContext = {},
): AdvisorSourceRow[] {
  return buildAdvisorSources(state, route).map((source) => ({
    ...source,
    contentHash: hashAdvisorSource(source.content),
    embedding: buildAdvisorEmbedding(source),
    sourceKind: "generated",
    syncedAt: new Date().toISOString(),
  }));
}

export async function loadStoredAdvisorSources(): Promise<AdvisorSource[]> {
  if (!hasPublicSupabaseEnv()) return [];

  try {
    const supabase = createPublicSupabaseClient();
    const { data, error } = await supabase
      .from("advisor_sources")
      .select(
        "id,title,href,track_slug,initiative_slug,content,embedding,source_kind",
      )
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("AYRA advisor source-table read failed; falling back to runtime sources.");
      return [];
    }

    const sources: AdvisorSource[] = [];
    for (const row of data ?? []) {
      const source = mapStoredAdvisorSource(row);
      if (source) sources.push(source);
    }
    return sources;
  } catch {
    console.error("AYRA advisor source-table read threw; falling back to runtime sources.");
    return [];
  }
}

export function mergeAdvisorSources(
  primary: AdvisorSource[],
  secondary: AdvisorSource[],
) {
  const seen = new Set<string>();
  const merged: AdvisorSource[] = [];

  for (const source of [...primary, ...secondary]) {
    if (seen.has(source.id)) continue;
    seen.add(source.id);
    merged.push(source);
  }

  return merged;
}

export function selectAdvisorSourcesForQuestion(
  question: string,
  sources: AdvisorSource[],
  route: AdvisorRouteContext = {},
  limit = 18,
) {
  return [...sources]
    .sort((a, b) => {
      const scoreDiff =
        scoreSourceForQuestion(b, question, route) -
        scoreSourceForQuestion(a, question, route);
      return scoreDiff === 0 ? a.id.localeCompare(b.id) : scoreDiff;
    })
    .slice(0, limit);
}

export function buildAdvisorPrompt(
  question: string,
  sources: AdvisorSource[],
  history: AdvisorConversationTurn[] = [],
) {
  const sourcePack = sources
    .slice(0, 18)
    .map(
      (item) =>
        `SOURCE ID: ${item.id}\nTITLE: ${item.title}\nHREF: ${item.href ?? ""}\nFACTS: ${item.content}`,
    )
    .join("\n\n");

  const historyPack =
    history.length > 0
      ? [
          "Conversation history:",
          ...history.map((turn) => `${turn.role.toUpperCase()}: ${turn.text}`),
          "",
        ].join("\n")
      : "";

  return [
    "You are the AYRA public advisor embedded in the transparency app.",
    "Answer only from the source pack below.",
    "Use a founder-operator voice: visionary and movement-building, warm, charismatic, and community-first.",
    "Be more talkative than a database answer: use short connected paragraphs, explain why the facts matter, and help the reader feel the civic momentum behind AYRA.",
    "You may sound principled and lightly ideological about public accountability, local adoption, open proof, and community-owned progress.",
    "Do not use crypto hype, cultish language, exaggerated certainty, or claims that the source pack does not prove.",
    "If the user writes AIRA, treat it as AYRA unless they clearly mean something else.",
    "Do not reveal private contacts, emails, phone numbers, payout addresses, raw receipt paths, failed payment details, or internal reconciliation notes.",
    "For general AYRA, Season, Studio, sponsorship, vertical, timeline, traction, or Providencia questions, use the AYRA North Star and Studio sources before project-proof sources.",
    "For application, login, admin, steward, portal, access, or how-to-use questions, use the AYRA application flow, login flow, and portal access sources. Give direct public paths such as /apply and /login when the source pack provides them.",
    "For funding questions, answer exact public totals when the source pack provides them. Use the terms Cleared and In flight.",
    "For approved, active, live, or funded project questions, use the approved-projects source. In AYRA public state, live and funding are the public approval statuses; draft is not public yet.",
    "Explain transaction hashes in plain public language: how to watch them, what they do, where they resolve, and which proof pack or explorer page to open.",
    "If the sources do not support the answer, set status to grounded_decline and say what public page to inspect instead.",
    "Every answered response must cite one to three source IDs copied exactly from the source pack.",
    "",
    historyPack,
    sourcePack,
    "",
    `Question: ${question}`,
  ]
    .filter(Boolean)
    .join("\n");
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
  const asksAyraOverview = isAyraOverviewQuestion(loweredQuestion);
  const asksStudio = isStudioQuestion(loweredQuestion);
  const asksSeason = isSeasonQuestion(loweredQuestion);
  const asksVerticals = isVerticalQuestion(loweredQuestion);
  const asksTraction = isTractionQuestion(loweredQuestion);
  const asksApplication = isApplicationQuestion(loweredQuestion);
  const asksLogin = isLoginQuestion(loweredQuestion);
  const asksPortalAccess = isPortalAccessQuestion(loweredQuestion);
  const asksApprovedProjects = isApprovedProjectsQuestion(question);
  const asksFunding =
    /\b(paid|settled|cleared|funded|funding|money|amount|batch|sponsor)\b/.test(
      loweredQuestion,
    );
  const asksStellar =
    /\b(stellar|transaction hash|tx hash|hash|ledger|explorer|watch|trace|payment track|where can it go)\b/.test(
      loweredQuestion,
    );
  const approvedProjectsSource =
    sources.find((item) => item.id === "ayra:approved-projects") ??
    sources.find((item) => item.id.startsWith("approved-projects:"));
  const fundingSource =
    sources.find((item) => item.id.startsWith("funding:")) ??
    sources.find((item) => item.id === "ayra:payment-language");
  const stellarSource =
    sources.find((item) => item.id.startsWith("stellar:")) ??
    sources.find((item) => item.id === "stellar:trace-rules");
  const northStarSource = sources.find((item) => item.id === "ayra:north-star");
  const studioSource = sources.find((item) => item.id === "ayra:studio-model");
  const seasonSource = sources.find((item) => item.id === "ayra:season-timeline");
  const verticalsSource = sources.find((item) => item.id === "ayra:verticals");
  const tractionSource = sources.find((item) => item.id === "ayra:traction");
  const applicationSource = sources.find((item) => item.id === "ayra:apply-flow");
  const loginSource = sources.find((item) => item.id === "ayra:login-flow");
  const portalAccessSource = sources.find(
    (item) => item.id === "ayra:portal-access",
  );

  if (asksAyraOverview && northStarSource) {
    return {
      answer:
        "AYRA is a place-first impact and technology season. The first zone is Providencia, in the Caribbean of Colombia, where AYRA brings companies, local partners, student fellows, artists, and builders together to test real adoption on the ground. Think of it as a real-life tech sandbox: not just a demo day, but a season where teams ship useful systems with the island.",
      citations: [advisorCitation(northStarSource)],
      followups: [
        "How does an AYRA Studio work?",
        "Why Providencia first?",
        "What are the seven verticals?",
      ],
      status: "answered",
    };
  }

  if (asksStudio && studioSource) {
    return {
      answer:
        "An AYRA Studio is the working unit of the season: one company backs one vertical, three teams test adoption with local partners, and up to nine local student fellows help make it operational. The sponsor cap is 37,500 EUR, and the work is judged through a 100-point scorecard with one winner and a continuation path after the season.",
      citations: [advisorCitation(studioSource)],
      followups: [
        "What does the sponsor budget cover?",
        "Which verticals can a sponsor choose?",
        "What happens in Providencia?",
      ],
      status: "answered",
    };
  }

  if (asksSeason && seasonSource) {
    return {
      answer:
        "Season 1 moves in three steps: Espacios from September 2026 to January 2027 across Berlin, Barcelona, Hong Kong, NYC, and Bogota; the Providencia residency from February to April 2027; then the Cartagena finale in late April or May 2027, where winners and Season Awards are presented through public stories, films, exhibitions, and performances.",
      citations: [advisorCitation(seasonSource)],
      followups: [
        "What happens during the Providencia residency?",
        "How does the Cartagena finale work?",
        "What is Espacios?",
      ],
      status: "answered",
    };
  }

  if (asksVerticals && verticalsSource) {
    return {
      answer:
        "The seven Season 1 verticals are Regenerative Life, Robotics and Physical Systems, Payments and Local Commerce, Culture and Identity, Learning and Human Development, Civic and Public Systems, and Compute and Agents. Each vertical gives a sponsor and its teams a concrete lane for adoption work in Providencia.",
      citations: [advisorCitation(verticalsSource)],
      followups: [
        "Which vertical fits local commerce?",
        "What is Compute and Agents?",
        "How does a sponsor reserve one vertical?",
      ],
      status: "answered",
    };
  }

  if (asksTraction && tractionSource) {
    return {
      answer:
        "AYRA points to two kinds of ground traction. On the payments side, VIIO is already operating as a B2SME wallet with production volume and regulated infrastructure partners. On the Providencia impact side, Climate Future programs have already planted trees and shrubs, worked with children across schools, and supported animal welfare on the island. That matters because AYRA is meant to build from existing local and operational proof, not from a blank slate.",
      citations: [advisorCitation(tractionSource)],
      followups: [
        "Who is VIIO?",
        "What has happened in Providencia already?",
        "How does this connect to Stellar proof?",
      ],
      status: "answered",
    };
  }

  if (asksApplication && applicationSource) {
    return {
      answer:
        "To make an application, go to /apply and fill out the initiative intake: applicant name, email, track, initiative, scope, operational details, milestones, and Signal or phone. Submit it with Submit for review. AYRA then runs admin review on the track, initiative scope, and contact model before granting scoped portal access. If the application is approved, the steward portal asks for the first Stellar payout address before any payment can be created.",
      citations: [advisorCitation(applicationSource)],
      followups: [
        "What happens after I apply?",
        "How do I log in after approval?",
        "What does the steward portal do?",
      ],
      status: "answered",
    };
  }

  if (asksLogin && loginSource) {
    return {
      answer:
        "To log in, go to /login. You can continue with Google or request a magic link by email. Use the email connected to your application or operator role, because AYRA opens access from live profile and role records, not from the sign-in method alone. If the email is not connected to an approved application or operator role, the login flow will ask you to submit an application first or use the approved admin email.",
      citations: [advisorCitation(loginSource)],
      followups: [
        "How do I submit an application?",
        "Why is my login blocked?",
        "What portal opens after sign-in?",
      ],
      status: "answered",
    };
  }

  if (asksPortalAccess && portalAccessSource) {
    return {
      answer:
        "Portal access is scoped. Admins review applications, approve or reject proposals, promote roles, verify payout addresses, moderate updates, and manage payment actions. An approved applicant can receive steward portal access for their initiative. In the steward portal, the steward can submit public updates and submit the first Stellar payout address for AYRA verification; no funding payment can be created until that address is verified and locked.",
      citations: [advisorCitation(portalAccessSource)],
      followups: [
        "How do I apply for steward access?",
        "How do I log in?",
        "What happens after payout address verification?",
      ],
      status: "answered",
    };
  }

  if (asksApprovedProjects && approvedProjectsSource) {
    return {
      answer: approvedProjectsSource.content,
      citations: [
        {
          sourceId: approvedProjectsSource.id,
          label: approvedProjectsSource.title,
          href: approvedProjectsSource.href,
        },
      ],
      followups: [
        "Show me the public project pages",
        "Which projects are still funding?",
        "What does live vs funding mean?",
      ],
      status: "answered",
    };
  }

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
        "Which payments are cleared?",
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
        "Which payment does this hash belong to?",
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
  if (sourceItem.id.startsWith("approved-projects:")) score += 6;
  if (sourceItem.id.startsWith("funding:")) score += 2;
  if (sourceItem.id.startsWith("stellar:")) score += 2;
  if (sourceItem.id.startsWith("ayra:")) score += 2;
  if (sourceItem.id === "ayra:north-star") score += 2;
  if (sourceItem.id === "ayra:apply-flow") score += 4;
  if (sourceItem.id === "ayra:login-flow") score += 4;
  if (sourceItem.id === "ayra:portal-access") score += 4;
  if (sourceItem.id === "ayra:public-boundary") score += 1;
  return score;
}

function scoreSourceForQuestion(
  sourceItem: AdvisorSource,
  question: string,
  route: AdvisorRouteContext,
) {
  const baseScore = scoreSource(sourceItem, route);
  const questionTokens = new Set(tokenizeAdvisorText(question));
  const sourceTokens = new Set(
    tokenizeAdvisorText([sourceItem.title, sourceItem.id, sourceItem.content].join(" ")),
  );
  let overlap = 0;
  for (const token of questionTokens) {
    if (sourceTokens.has(token)) overlap += 1;
  }

  return baseScore + overlap * 3;
}

function groundedDecline(answer: string): AdvisorAnswer {
  return {
    answer,
    citations: [],
    followups: [
      "Which projects are currently approved?",
      "What is AYRA funding?",
      "How do public proof packs work?",
      "How do I become a sponsor?",
      "How do I watch a transaction hash?",
    ],
    status: "grounded_decline",
  };
}

function advisorCitation(source: AdvisorSource): AdvisorCitation {
  return {
    sourceId: source.id,
    label: source.title,
    href: source.href,
  };
}

function isAyraOverviewQuestion(loweredQuestion: string) {
  return (
    /\b(ayra|aira)\b/.test(loweredQuestion) &&
    /\b(what|who|explain|about|overview|mean|mission|north star|north-star|purpose|why)\b/.test(
      loweredQuestion,
    )
  );
}

function isStudioQuestion(loweredQuestion: string) {
  return (
    /\b(studio|studios|sponsor|sponsorship|back|reserve|budget|37,?500|37500|sandbox)\b/.test(
      loweredQuestion,
    ) &&
    /\b(ayra|aira|studio|studios|sponsor|sponsorship)\b/.test(loweredQuestion)
  );
}

function isSeasonQuestion(loweredQuestion: string) {
  return /\b(season|timeline|espacios|cartagena|residency|finale|when|2026|2027)\b/.test(
    loweredQuestion,
  );
}

function isVerticalQuestion(loweredQuestion: string) {
  return /\b(vertical|verticals|regenerative|robotics|payments|commerce|culture|learning|civic|compute|agents)\b/.test(
    loweredQuestion,
  );
}

function isTractionQuestion(loweredQuestion: string) {
  return /\b(traction|proof|viio|partner|partners|climate future|trees|children|dogs|cats|why this works)\b/.test(
    loweredQuestion,
  );
}

function isApplicationQuestion(loweredQuestion: string) {
  return (
    /\b(apply|application|applicant|proposal|propose|intake|submit|submission)\b/.test(
      loweredQuestion,
    ) ||
    /\bhow do i (make|send|submit|start|create).*\b(application|proposal)\b/.test(
      loweredQuestion,
    )
  );
}

function isLoginQuestion(loweredQuestion: string) {
  return /\b(log in|login|sign in|signin|magic link|google|email link|auth|account)\b/.test(
    loweredQuestion,
  );
}

function isPortalAccessQuestion(loweredQuestion: string) {
  return (
    /\b(admin|steward|portal|access|role|roles|operator|grantee|payout address|approved applicant)\b/.test(
      loweredQuestion,
    ) &&
    /\b(how|what|where|who|why|get|open|enter|use|allowed|access)\b/.test(
      loweredQuestion,
    )
  );
}

function tokenizeAdvisorText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 2 && !advisorStopWords.has(token));
}

function buildAdvisorEmbedding(source: AdvisorSource) {
  return Array.from(
    new Set(tokenizeAdvisorText([source.title, source.id, source.content].join(" "))),
  ).slice(0, 48);
}

function hashAdvisorSource(content: string) {
  return createHash("sha256").update(content).digest("hex");
}

function mapStoredAdvisorSource(row: {
  id: string;
  title: string;
  href: string | null;
  track_slug: string | null;
  initiative_slug: string | null;
  content: string;
  embedding: unknown;
  source_kind?: string | null;
}): AdvisorSource | null {
  if (!row.id || !row.title || !row.content) return null;
  if (hasPrivateContent(row.content)) return null;

  return {
    id: row.id,
    title: row.title,
    href: row.href ?? undefined,
    trackSlug: row.track_slug ?? undefined,
    initiativeSlug: row.initiative_slug ?? undefined,
    content: row.content,
  } satisfies AdvisorSource;
}
