"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  buildAuthCallbackUrl,
  canSubmitForMilestone,
  googleProviderEnabledFromSettings,
} from "@/lib/ayra/auth";
import {
  DEFAULT_APPLICATION_MILESTONES,
  applicationSchema,
  normalizeMilestonePlan,
} from "@/lib/ayra/application-intake";
import { hasPublicSupabaseEnv } from "@/lib/ayra/data";
import { MAX_UPDATE_MEDIA_BYTES } from "@/lib/ayra/upload";
import {
  loginPath,
  requireAdminSession,
  requireStewardSession,
  safeNextPath,
  type AyraSession,
} from "@/lib/ayra/session";
import {
  createSdpGateway,
  SdpGatewayError,
  type SdpGatewayEvent,
} from "@/lib/ayra/sdp";
import {
  getStellarUsdcTrustlineStatus,
  verifyStellarUsdcPayment,
  verifyStellarUsdcTrustline,
  StellarProofError,
} from "@/lib/ayra/stellar-proof";
import { insertPublicApplication } from "@/lib/ayra/public-write";
import {
  getUsdCopRate,
  normalizeBatchCurrencyAmounts,
} from "@/lib/ayra/currency";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginStatusForAuthError } from "@/lib/ayra/status";

const updateSchema = z.object({
  milestoneId: z.string().trim().min(1),
  caption: z.string().trim().min(20),
  mediaUrl: z.string().trim().optional(),
  mediaAlt: z.string().trim().optional(),
});

const milestoneSubmissionSchema = z.object({
  milestoneId: z.string().trim().min(1),
  title: z.string().trim().min(4),
  summary: z.string().trim().min(10),
});

const idActionSchema = z.object({
  entityId: z.string().trim().min(1),
});

const reviewMilestoneSubmissionSchema = idActionSchema.extend({
  status: z.enum(["approved", "rejected"]),
  reviewNote: z.string().trim().optional(),
});

const moderateSchema = idActionSchema.extend({
  action: z.enum(["approve", "edit-and-approve", "reject", "save draft"]),
  publicCaption: z.string().trim().optional(),
  sanitizedFeedback: z.string().trim().optional(),
});

const batchSchema = z.object({
  initiativeId: z.string().trim().min(1),
  code: z.string().trim().min(4),
  periodLabel: z.string().trim().min(4),
  sponsorId: z.string().trim().optional(),
  category: z.string().trim().min(2),
  amountUsdc: optionalPositiveNumber().refine(
    (value) => value === undefined || hasCentsPrecision(value),
    "USDC amount must use at most two decimals.",
  ),
  localAmount: optionalPositiveNumber(),
  localCurrency: z.enum(["COP", "USD"]),
  amountSource: z.enum(["usdc", "local"]).optional(),
  paymentKind: z.enum(["normal", "advance"]),
  milestoneSubmissionId: z.string().trim().optional(),
})
  .refine((value) => value.amountUsdc !== undefined || value.localAmount !== undefined, {
    message: "A USDC or local amount is required.",
  })
  .refine(
    (value) => value.paymentKind === "advance" || Boolean(value.milestoneSubmissionId),
    {
      message: "Normal payments require a milestone submission.",
    },
  );

const payoutAddressSchema = z.object({
  initiativeId: z.string().trim().min(1),
  address: z.string().trim().regex(/^G[A-Z2-7]{55}$/, "Invalid Stellar address"),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  next: z.string().trim().optional(),
});

type ApplicationRow = {
  id: string;
  applicant_name: string;
  applicant_email: string;
  proposed_track_name: string;
  proposed_initiative_name: string;
  scope_summary: string;
  operational_notes: string;
  milestone_plan: string[] | null;
  contact_signal: string;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key).trim();
  return value.length > 0 ? value : undefined;
}

function hasCentsPrecision(value: number) {
  const cents = value * 100;
  return Number.isSafeInteger(Math.round(cents)) && Math.abs(cents - Math.round(cents)) < 1e-8;
}

function optionalPositiveNumber() {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length === 0 ? undefined : value,
    z.coerce.number().positive().optional(),
  );
}

function optionalFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (
    value &&
    typeof value === "object" &&
    "size" in value &&
    "arrayBuffer" in value &&
    Number(value.size) > 0
  ) {
    return value as File;
  }
  return null;
}

function mediaKindFromFile(file: File | null) {
  return file?.type.startsWith("video/") ? "video" : "image";
}

function redirectWithStatus(path: string, status: string): never {
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

function demoRedirect(path: string, status: string): never {
  redirectWithStatus(path, `demo-${status}`);
}

async function insertAudit(
  supabase: SupabaseClient | null,
  session: AyraSession,
  input: {
    action: string;
    entityType: string;
    entityId?: string;
    after?: Record<string, unknown>;
  },
) {
  if (!supabase) return;
  await supabase.from("audit_logs").insert({
    actor_profile_id: session.context.profile.id,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    after_summary: input.after ?? null,
  });
}

function safeStorageName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);
}

async function uploadFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return null;
  return path;
}

function publicStorageUrl(supabase: SupabaseClient, bucket: string, path: string) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function insertSdpEvents(
  supabase: SupabaseClient,
  batchId: string,
  events: SdpGatewayEvent[],
) {
  if (events.length === 0) return;
  await supabase.from("sdp_sync_events").insert(
    events.map((event) => ({
      batch_id: batchId,
      provider: event.provider,
      action: event.action,
      status: event.status,
      external_id: event.externalId ?? null,
      message: event.message ?? null,
    })),
  );
}

function sdpEventsFromError(error: unknown) {
  return error instanceof SdpGatewayError ? error.events : [];
}

function isUniqueConstraintError(
  error: { code?: string; details?: string | null; message?: string } | null,
  constraint: string,
) {
  return (
    error?.code === "23505" &&
    [error.details, error.message].some((value) => value?.includes(constraint))
  );
}

async function isGoogleProviderEnabled() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`,
      {
        cache: "no-store",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      },
    );
    if (!response.ok) return false;
    return googleProviderEnabledFromSettings(await response.json());
  } catch {
    return false;
  }
}

export async function requestMagicLinkAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    next: optionalText(formData, "next"),
  });
  if (!parsed.success) redirectWithStatus("/login", "invalid");
  if (!hasPublicSupabaseEnv()) redirectWithStatus("/login", "supabase-not-configured");

  const next = safeNextPath(parsed.data.next, "/login");
  const eligibility = await loginEligibilityForEmail(parsed.data.email);
  if (eligibility === "application-required") {
    redirect(loginPath(next, "application-required"));
  }
  if (eligibility === "scope-required") {
    redirect(loginPath(next, "scope-required"));
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(origin, next),
      shouldCreateUser: true,
    },
  });

  redirect(loginPath(next, error ? loginStatusForAuthError(error) : "link-sent"));
}

async function loginEligibilityForEmail(
  email: string,
): Promise<"eligible" | "application-required" | "scope-required"> {
  let supabase: SupabaseClient;
  try {
    supabase = createSupabaseAdminClient();
  } catch {
    return "eligible";
  }

  const normalizedEmail = email.trim().toLowerCase();
  const profile = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (profile.error) return "eligible";

  if (!profile.data?.id) {
    const application = await supabase
      .from("applications")
      .select("id")
      .eq("applicant_email", normalizedEmail)
      .limit(1);
    if (application.error) return "eligible";
    return application.data?.length ? "scope-required" : "application-required";
  }

  const roles = await supabase
    .from("user_roles")
    .select("id")
    .eq("profile_id", profile.data.id)
    .in("role", ["admin", "steward", "grantee_contact"])
    .limit(1);
  if (roles.error) return "eligible";
  return roles.data?.length ? "eligible" : "scope-required";
}

export async function requestGoogleLoginAction(formData: FormData) {
  const next = safeNextPath(optionalText(formData, "next"), "/login");
  if (!hasPublicSupabaseEnv()) redirect(loginPath(next, "supabase-not-configured"));
  if (!(await isGoogleProviderEnabled())) {
    redirect(loginPath(next, "google-provider-unavailable"));
  }

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: buildAuthCallbackUrl(origin, next),
    },
  });

  if (error || !data.url) {
    redirect(loginPath(next, "google-provider-unavailable"));
  }

  redirect(data.url);
}

export async function submitApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    applicantName: text(formData, "applicantName"),
    applicantEmail: text(formData, "applicantEmail"),
    proposedTrackName: text(formData, "proposedTrackName"),
    proposedInitiativeName: text(formData, "proposedInitiativeName"),
    scopeSummary: text(formData, "scopeSummary"),
    operationalNotes: text(formData, "operationalNotes"),
    milestonePlan: normalizeMilestonePlan(text(formData, "milestonePlan")),
    contactSignal: text(formData, "contactSignal"),
  });

  if (!parsed.success) redirectWithStatus("/apply", "invalid");
  if (!hasPublicSupabaseEnv()) demoRedirect("/apply", "submitted");

  const result = await insertPublicApplication(
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    },
    parsed.data,
  );
  if (!result.ok) redirectWithStatus("/apply", "error");

  revalidatePath("/admin");
  redirectWithStatus("/apply", "submitted");
}

export async function submitUpdateAction(formData: FormData) {
  const parsed = updateSchema.safeParse({
    milestoneId: text(formData, "milestoneId"),
    caption: text(formData, "caption"),
    mediaUrl: optionalText(formData, "mediaUrl"),
    mediaAlt: optionalText(formData, "mediaAlt"),
  });
  if (!parsed.success) redirectWithStatus("/steward", "invalid");

  const session = await requireStewardSession("/steward");
  if (session.isDemo) demoRedirect("/steward", "update-submitted");

  const milestone = session.state.milestones.find(
    (item) => item.id === parsed.data.milestoneId,
  );
  if (!milestone || !canSubmitForMilestone(session.context, milestone)) {
    redirectWithStatus("/steward", "scope-denied");
  }

  const source = session.context.roles.some(
    (role) => role.role === "steward" && role.initiativeId === milestone.initiativeId,
  )
    ? "steward"
    : "grantee_contact";

  const supabase = session.supabase!;
  const mediaFile = optionalFile(formData, "mediaFile");
  if (mediaFile && mediaFile.size > MAX_UPDATE_MEDIA_BYTES) {
    redirectWithStatus("/steward", "media-too-large");
  }
  let mediaUrl = parsed.data.mediaUrl;
  let adminSupabase: SupabaseClient | null = null;
  if (mediaFile || mediaUrl) {
    try {
      adminSupabase = createSupabaseAdminClient();
    } catch {
      redirectWithStatus("/steward", "media-error");
    }
  }
  const updateId = crypto.randomUUID();
  const { error } = await supabase
    .from("initiative_updates")
    .insert({
      id: updateId,
      initiative_id: milestone.initiativeId,
      milestone_id: milestone.id,
      submitted_by_profile_id: session.context.profile.id,
      source,
      caption: parsed.data.caption,
      status: "pending",
    })
  if (error) redirectWithStatus("/steward", "error");

  if (mediaFile) {
    const name = safeStorageName(mediaFile.name || "update-media");
    const path = `updates/${updateId}/${Date.now()}-${name}`;
    const uploaded = await uploadFile(
      supabase,
      "ayra-public-update-media",
      path,
      mediaFile,
    );
    if (!uploaded) {
      await adminSupabase?.from("initiative_updates").delete().eq("id", updateId);
      redirectWithStatus("/steward", "media-error");
    }
    mediaUrl = publicStorageUrl(supabase, "ayra-public-update-media", uploaded);
  }

  if (mediaUrl) {
    const media = await adminSupabase!.from("update_media").insert({
      update_id: updateId,
      kind: mediaKindFromFile(mediaFile),
      url: mediaUrl,
      alt: parsed.data.mediaAlt ?? "Submitted update media",
      public_ready: false,
    });
    if (media.error) {
      await adminSupabase!.from("initiative_updates").delete().eq("id", updateId);
      redirectWithStatus("/steward", "media-error");
    }
  }

  await insertAudit(supabase, session, {
    action: "update.submitted",
    entityType: "initiative_update",
    entityId: updateId,
    after: { status: "pending" },
  });
  revalidatePath("/admin");
  redirectWithStatus("/steward", "update-submitted");
}

export async function submitMilestoneSubmissionAction(formData: FormData) {
  const parsed = milestoneSubmissionSchema.safeParse({
    milestoneId: text(formData, "milestoneId"),
    title: text(formData, "title"),
    summary: text(formData, "summary"),
  });
  if (!parsed.success) redirectWithStatus("/steward", "invalid");

  const session = await requireStewardSession("/steward");
  if (session.isDemo) demoRedirect("/steward", "milestone-submitted");

  const milestone = session.state.milestones.find(
    (item) => item.id === parsed.data.milestoneId,
  );
  if (!milestone || !canSubmitForMilestone(session.context, milestone)) {
    redirectWithStatus("/steward", "scope-denied");
  }

  const evidenceFile = optionalFile(formData, "privateDocumentFile");
  const supabase = session.supabase!;
  let privateDocumentPath: string | null = null;
  const submissionId = crypto.randomUUID();
  if (evidenceFile) {
    let adminSupabase: SupabaseClient;
    try {
      adminSupabase = createSupabaseAdminClient();
    } catch {
      redirectWithStatus("/steward", "milestone-upload-error");
    }
    const name = safeStorageName(evidenceFile.name || "milestone-evidence");
    privateDocumentPath = await uploadFile(
      adminSupabase,
      "ayra-private-receipts",
      `milestone-submissions/${submissionId}/${Date.now()}-${name}`,
      evidenceFile,
    );
    if (!privateDocumentPath) redirectWithStatus("/steward", "milestone-upload-error");
  }

  const { error } = await supabase.from("milestone_submissions").insert({
    id: submissionId,
    initiative_id: milestone.initiativeId,
    milestone_id: milestone.id,
    submitted_by_profile_id: session.context.profile.id,
    status: "submitted",
    title: parsed.data.title,
    summary: parsed.data.summary,
    private_document_path: privateDocumentPath,
  });
  if (error) redirectWithStatus("/steward", "error");

  await insertAudit(supabase, session, {
    action: "milestone_submission.submitted",
    entityType: "milestone_submission",
    entityId: submissionId,
    after: { status: "submitted" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
  revalidatePath("/steward");
  redirectWithStatus("/steward", "milestone-submitted");
}

export async function submitPayoutAddressAction(formData: FormData) {
  const parsed = payoutAddressSchema.safeParse({
    initiativeId: text(formData, "initiativeId"),
    address: text(formData, "address"),
  });
  if (!parsed.success) redirectWithStatus("/steward", "invalid");

  const session = await requireStewardSession("/steward");
  if (session.isDemo) demoRedirect("/steward", "payout-submitted");
  if (!session.context.scopedInitiativeIds.includes(parsed.data.initiativeId)) {
    redirectWithStatus("/steward", "scope-denied");
  }

  const supabase = createSupabaseAdminClient();
  await supabase
    .from("payout_addresses")
    .update({ status: "rejected" })
    .eq("initiative_id", parsed.data.initiativeId)
    .in("status", ["pending", "verified", "locked"]);

  const { data, error } = await supabase
    .from("payout_addresses")
    .insert({
      initiative_id: parsed.data.initiativeId,
      address: parsed.data.address,
      status: "pending",
      submitted_by_profile_id: session.context.profile.id,
    })
    .select("id")
    .single();
  if (error || !data) redirectWithStatus("/steward", "error");

  await insertAudit(supabase, session, {
    action: "payout_address.submitted",
    entityType: "payout_address",
    entityId: data.id,
    after: { status: "pending" },
  });
  revalidatePath("/admin");
  revalidatePath("/steward");

  const expectedUsdcIssuer = process.env.STELLAR_USDC_ISSUER?.trim();
  if (!expectedUsdcIssuer) {
    redirectWithStatus("/steward", "payout-submitted");
  }

  const trustlineStatus = await getStellarUsdcTrustlineStatus({
    accountId: parsed.data.address,
    expectedIssuer: expectedUsdcIssuer,
    horizonUrl: process.env.STELLAR_HORIZON_URL?.trim(),
  });
  if (trustlineStatus === "ready") {
    redirectWithStatus("/steward", "payout-submitted-ready");
  }
  if (trustlineStatus === "missing") {
    redirectWithStatus("/steward", "payout-submitted-trustline-missing");
  }
  redirectWithStatus("/steward", "payout-submitted");
}

export async function approveApplicationAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "applicationId"),
  });
  if (!parsed.success) redirectWithStatus("/admin/applications", "invalid");

  const session = await requireAdminSession("/admin/applications");
  if (session.isDemo) demoRedirect("/admin/applications", "application-approved");

  const supabase = session.supabase!;
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select(
      "id,applicant_name,applicant_email,proposed_track_name,proposed_initiative_name,scope_summary,operational_notes,milestone_plan,contact_signal",
    )
    .eq("id", parsed.data.entityId)
    .eq("status", "pending")
    .single();
  if (applicationError || !application) redirectWithStatus("/admin/applications", "error");

  const promoted = await promoteApplication(supabase, application as ApplicationRow);
  if (!promoted) redirectWithStatus("/admin/applications", "promotion-error");

  const { error } = await supabase
    .from("applications")
    .update({
      status: "approved",
      decided_by_profile_id: session.context.profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "pending");
  if (error) redirectWithStatus("/admin/applications", "error");

  await insertAudit(supabase, session, {
    action: "application.approved",
    entityType: "application",
    entityId: parsed.data.entityId,
    after: {
      status: "approved",
      initiativeId: promoted.initiativeId,
      profileId: promoted.profileId,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  redirectWithStatus("/admin/applications", "application-approved");
}

export async function rejectApplicationAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "applicationId"),
  });
  if (!parsed.success) redirectWithStatus("/admin/applications", "invalid");

  const session = await requireAdminSession("/admin/applications");
  if (session.isDemo) demoRedirect("/admin/applications", "application-rejected");

  const supabase = session.supabase!;
  const { error } = await supabase
    .from("applications")
    .update({
      status: "rejected",
      decided_by_profile_id: session.context.profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "pending");
  if (error) redirectWithStatus("/admin/applications", "error");

  await insertAudit(supabase, session, {
    action: "application.rejected",
    entityType: "application",
    entityId: parsed.data.entityId,
    after: { status: "rejected" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/applications");
  redirectWithStatus("/admin/applications", "application-rejected");
}

export async function verifyPayoutAddressAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "payoutAddressId"),
  });
  if (!parsed.success) redirectWithStatus("/admin/registry", "invalid");

  const session = await requireAdminSession("/admin/registry");
  if (session.isDemo) demoRedirect("/admin/registry", "payout-verified");

  const supabase = session.supabase!;
  const { data: payoutAddress, error: readError } = await supabase
    .from("payout_addresses")
    .select("id,initiative_id")
    .eq("id", parsed.data.entityId)
    .single();
  if (readError || !payoutAddress) redirectWithStatus("/admin/registry", "error");

  await supabase
    .from("payout_addresses")
    .update({ status: "rejected" })
    .eq("initiative_id", payoutAddress.initiative_id)
    .neq("id", parsed.data.entityId)
    .in("status", ["pending", "verified", "locked"]);

  const { error } = await supabase
    .from("payout_addresses")
    .update({
      status: "verified",
      verified_by_profile_id: session.context.profile.id,
      verified_at: new Date().toISOString(),
      verification_note:
        optionalText(formData, "verificationNote") ?? "Manual v1 verification.",
    })
    .eq("id", parsed.data.entityId);
  if (error) redirectWithStatus("/admin/registry", "error");

  await insertAudit(supabase, session, {
    action: "payout_address.verified",
    entityType: "payout_address",
    entityId: parsed.data.entityId,
    after: { status: "verified" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/registry");
  redirectWithStatus("/admin/registry", "payout-verified");
}

export async function reviewMilestoneSubmissionAction(formData: FormData) {
  const parsed = reviewMilestoneSubmissionSchema.safeParse({
    entityId: text(formData, "milestoneSubmissionId"),
    status: text(formData, "status"),
    reviewNote: optionalText(formData, "reviewNote"),
  });
  if (!parsed.success) redirectWithStatus("/admin/batches", "invalid");

  const session = await requireAdminSession("/admin/batches");
  if (session.isDemo) demoRedirect("/admin/batches", "milestone-reviewed");

  const supabase = session.supabase!;
  const { error } = await supabase
    .from("milestone_submissions")
    .update({
      status: parsed.data.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by_profile_id: session.context.profile.id,
      review_note: parsed.data.reviewNote,
    })
    .eq("id", parsed.data.entityId);
  if (error) redirectWithStatus("/admin/batches", "error");

  await insertAudit(supabase, session, {
    action: `milestone_submission.${parsed.data.status}`,
    entityType: "milestone_submission",
    entityId: parsed.data.entityId,
    after: { status: parsed.data.status },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
  redirectWithStatus("/admin/batches", "milestone-reviewed");
}

export async function moderateUpdateAction(formData: FormData) {
  const parsed = moderateSchema.safeParse({
    entityId: text(formData, "updateId"),
    action: text(formData, "action"),
    publicCaption: optionalText(formData, "publicCaption"),
    sanitizedFeedback: optionalText(formData, "sanitizedFeedback"),
  });
  if (!parsed.success) redirectWithStatus("/admin/updates", "invalid");

  const session = await requireAdminSession("/admin/updates");
  if (session.isDemo) demoRedirect("/admin/updates", "update-moderated");

  const status =
    parsed.data.action === "reject"
      ? "rejected"
      : parsed.data.action === "save draft"
        ? "draft"
        : "approved";
  const supabase = session.supabase!;
  const { error } = await supabase
    .from("initiative_updates")
    .update({
      status,
      public_caption: parsed.data.publicCaption,
      sanitized_feedback: parsed.data.sanitizedFeedback,
      moderated_by_profile_id: session.context.profile.id,
      published_at: status === "approved" ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.entityId);
  if (error) redirectWithStatus("/admin/updates", "error");

  if (status === "approved") {
    await supabase
      .from("update_media")
      .update({ public_ready: true })
      .eq("update_id", parsed.data.entityId);
  }

  await insertAudit(supabase, session, {
    action: `update.${parsed.data.action.replaceAll(" ", "_")}`,
    entityType: "initiative_update",
    entityId: parsed.data.entityId,
    after: { status },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/updates");
  redirectWithStatus("/admin/updates", "update-moderated");
}

export async function createBatchAction(formData: FormData) {
  const parsed = batchSchema.safeParse({
    initiativeId: text(formData, "initiativeId"),
    code: text(formData, "code"),
    periodLabel: text(formData, "periodLabel"),
    sponsorId: optionalText(formData, "sponsorId"),
    category: text(formData, "category"),
    amountUsdc: text(formData, "amountUsdc"),
    localAmount: text(formData, "localAmount"),
    localCurrency: text(formData, "localCurrency"),
    amountSource: optionalText(formData, "amountSource"),
    paymentKind: text(formData, "paymentKind"),
    milestoneSubmissionId: optionalText(formData, "milestoneSubmissionId"),
  });
  if (!parsed.success) {
    const paymentKind = text(formData, "paymentKind");
    redirectWithStatus(
      "/admin/batches",
      paymentKind === "normal" ? "milestone-required" : "invalid",
    );
  }

  let normalizedAmounts;
  try {
    const { rate } = await getUsdCopRate();
    normalizedAmounts = normalizeBatchCurrencyAmounts(parsed.data, rate);
  } catch {
    redirectWithStatus("/admin/batches", "exchange-rate-error");
  }

  const session = await requireAdminSession("/admin/batches");
  if (session.isDemo) {
    demoRedirect(
      "/admin/batches",
      parsed.data.paymentKind === "advance" ? "advance-created" : "batch-created",
    );
  }

  const supabase = session.supabase!;
  const hasVerifiedAddress = await initiativeHasVerifiedAddress(
    supabase,
    parsed.data.initiativeId,
  );
  if (!hasVerifiedAddress) redirectWithStatus("/admin/batches", "payout-required");
  const milestoneSubmissionId =
    parsed.data.paymentKind === "normal" ? parsed.data.milestoneSubmissionId : null;
  if (parsed.data.paymentKind === "normal") {
    const available = await approvedMilestoneSubmissionAvailable(
      supabase,
      parsed.data.initiativeId,
      milestoneSubmissionId,
    );
    if (!available) redirectWithStatus("/admin/batches", "milestone-unavailable");
  }

  const { data, error } = await supabase
    .from("funding_batches")
    .insert({
      initiative_id: parsed.data.initiativeId,
      sponsor_id: parsed.data.sponsorId ?? null,
      code: parsed.data.code,
      period_label: parsed.data.periodLabel,
      payment_kind: parsed.data.paymentKind,
      milestone_submission_id: milestoneSubmissionId,
      status: "ready",
      created_by_profile_id: session.context.profile.id,
    })
    .select("id")
    .single();
  if (error) {
    if (isUniqueConstraintError(error, "funding_batches_code_key")) {
      redirectWithStatus("/admin/batches", "duplicate-batch-code");
    }
    redirectWithStatus("/admin/batches", "error");
  }

  const lineItem = await supabase
    .from("batch_line_items")
    .insert({
      batch_id: data.id,
      category: parsed.data.category,
      amount_usdc: normalizedAmounts.amountUsdc,
      local_amount: normalizedAmounts.localAmount,
      local_currency: normalizedAmounts.localCurrency,
      status: "draft",
    })
    .select("id")
    .single();
  if (lineItem.error || !lineItem.data) redirectWithStatus("/admin/batches", "line-item-error");

  const allocation = await supabase.from("funding_allocations").insert({
    initiative_id: parsed.data.initiativeId,
    sponsor_id: parsed.data.sponsorId ?? null,
    batch_id: data.id,
    category: parsed.data.category,
    amount_usdc: normalizedAmounts.amountUsdc,
    local_amount: normalizedAmounts.localAmount,
    local_currency: normalizedAmounts.localCurrency,
    status: "batched",
    notes: "Created from admin one-line batch form.",
    created_by_profile_id: session.context.profile.id,
  });
  if (allocation.error) redirectWithStatus("/admin/batches", "allocation-error");

  const receiptFile = optionalFile(formData, "receiptFile");
  let privateReceiptPath: string | null = null;
  if (receiptFile) {
    const name = safeStorageName(receiptFile.name || "receipt");
    privateReceiptPath = await uploadFile(
      supabase,
      "ayra-private-receipts",
      `receipts/${data.id}/${Date.now()}-${name}`,
      receiptFile,
    );
    if (!privateReceiptPath) redirectWithStatus("/admin/batches", "receipt-error");
  }

  const reconciliation = await supabase.from("reconciliation_items").insert({
    batch_id: data.id,
    line_item_id: lineItem.data.id,
    status: privateReceiptPath ? "receipt_attached" : "needs_receipt",
    private_receipt_path: privateReceiptPath,
    note: privateReceiptPath
      ? "Private receipt attached at batch creation."
      : "Awaiting private receipt.",
    created_by_profile_id: session.context.profile.id,
  });
  if (reconciliation.error) redirectWithStatus("/admin/batches", "reconciliation-error");

  await insertAudit(supabase, session, {
    action: "batch.created",
    entityType: "batch",
    entityId: data.id,
    after: {
      status: "ready",
      paymentKind: parsed.data.paymentKind,
      milestoneSubmissionId,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
  redirectWithStatus(
    "/admin/batches",
    parsed.data.paymentKind === "advance" ? "advance-created" : "batch-created",
  );
}

export async function submitBatchAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "batchId"),
  });
  if (!parsed.success) redirectWithStatus("/admin/batches", "invalid");

  const session = await requireAdminSession("/admin/batches");
  if (session.isDemo) demoRedirect("/admin/batches", "batch-submitted");

  const supabase = session.supabase!;
  const { data: batch, error: batchError } = await supabase
    .from("funding_batches")
    .select("id,initiative_id,code,sdp_batch_id")
    .eq("id", parsed.data.entityId)
    .eq("status", "ready")
    .single();
  if (batchError || !batch) redirectWithStatus("/admin/batches", "error");

  const hasVerifiedAddress = await initiativeHasVerifiedAddress(
    supabase,
    batch.initiative_id,
  );
  if (!hasVerifiedAddress) redirectWithStatus("/admin/batches", "payout-required");

  const { data: lineItems, error: lineItemReadError } = await supabase
    .from("batch_line_items")
    .select("id,category,amount_usdc")
    .eq("batch_id", parsed.data.entityId);
  if (lineItemReadError || !lineItems || lineItems.length === 0) {
    redirectWithStatus("/admin/batches", "line-item-error");
  }

  const destination = await loadSdpDestination(supabase, batch.initiative_id);
  if (!destination) redirectWithStatus("/admin/batches", "payout-required");
  if (process.env.STELLAR_USDC_ISSUER?.trim()) {
    try {
      await verifyStellarUsdcTrustline({
        accountId: destination.walletAddress,
        expectedIssuer: process.env.STELLAR_USDC_ISSUER.trim(),
        horizonUrl: process.env.STELLAR_HORIZON_URL?.trim(),
      });
    } catch {
      redirectWithStatus("/admin/batches", "payout-trustline-required");
    }
  }

  const gateway = createSdpGateway();
  let sdp;
  try {
    sdp = await gateway.submitBatch(
      { id: batch.id, code: batch.code, sdpBatchId: batch.sdp_batch_id },
      lineItems.map((item) => ({
        id: item.id,
        category: item.category,
        amountUsdc: Number(item.amount_usdc),
        receiverEmail: destination.receiverEmail,
        walletAddress: destination.walletAddress,
        walletAddressMemo: destination.walletAddressMemo,
      })),
    );
  } catch (error) {
    await insertSdpEvents(supabase, parsed.data.entityId, sdpEventsFromError(error));
    redirectWithStatus("/admin/batches", "sdp-error");
  }

  const { error } = await supabase
    .from("funding_batches")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      sdp_batch_id: sdp.externalBatchId,
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "ready");
  if (error) redirectWithStatus("/admin/batches", "error");

  const lineItemUpdates = await Promise.all(
    lineItems.map((lineItem) => {
      const payment = sdp.payments.find((item) => item.lineItemId === lineItem.id);
      return supabase
        .from("batch_line_items")
        .update({
          status: "submitted",
          sdp_payment_id: payment?.paymentId ?? null,
        })
        .eq("id", lineItem.id);
    }),
  );
  if (lineItemUpdates.some((result) => result.error)) {
    redirectWithStatus("/admin/batches", "line-item-error");
  }

  await supabase
    .from("funding_allocations")
    .update({ status: "submitted" })
    .eq("batch_id", parsed.data.entityId);
  await insertSdpEvents(supabase, parsed.data.entityId, sdp.events);

  await insertAudit(supabase, session, {
    action: "batch.submitted",
    entityType: "batch",
    entityId: parsed.data.entityId,
    after: { status: "submitted", sdpBatchId: sdp.externalBatchId },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
  redirectWithStatus("/admin/batches", "batch-submitted");
}

export async function syncBatchStatusAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "batchId"),
  });
  if (!parsed.success) redirectWithStatus("/admin/batches", "invalid");

  const session = await requireAdminSession("/admin/batches");
  if (session.isDemo) demoRedirect("/admin/batches", "batch-synced");

  const supabase = session.supabase!;
  const { data: batch, error: batchError } = await supabase
    .from("funding_batches")
    .select("id,initiative_id,code,sdp_batch_id")
    .eq("id", parsed.data.entityId)
    .eq("status", "submitted")
    .single();
  if (batchError || !batch) redirectWithStatus("/admin/batches", "error");

  const { data: lineItems, error: lineItemError } = await supabase
    .from("batch_line_items")
    .select("id,category,amount_usdc,sdp_payment_id")
    .eq("batch_id", parsed.data.entityId);
  if (lineItemError || !lineItems || lineItems.length === 0) {
    redirectWithStatus("/admin/batches", "line-item-error");
  }

  const destination = await loadSdpDestination(supabase, batch.initiative_id);
  if (!destination) redirectWithStatus("/admin/batches", "payout-required");

  const gateway = createSdpGateway();
  let sdp;
  try {
    sdp = await gateway.syncStatus(
      { id: batch.id, code: batch.code, sdpBatchId: batch.sdp_batch_id },
      lineItems.map((item) => ({
        id: item.id,
        category: item.category,
        amountUsdc: Number(item.amount_usdc),
        sdpPaymentId: item.sdp_payment_id,
        receiverEmail: destination.receiverEmail,
        walletAddress: destination.walletAddress,
        walletAddressMemo: destination.walletAddressMemo,
      })),
    );
  } catch (error) {
    await insertSdpEvents(supabase, parsed.data.entityId, sdpEventsFromError(error));
    redirectWithStatus("/admin/batches", "sdp-error");
  }

  const expectedUsdcIssuer = process.env.STELLAR_USDC_ISSUER?.trim();
  const horizonUrl = process.env.STELLAR_HORIZON_URL?.trim();
  const verifiedPayments = new Map<
    string,
    {
      transactionHash: string;
      assetCode: "USDC";
      assetIssuer: string;
      assetAmount: number;
    }
  >();
  const verificationEvents: SdpGatewayEvent[] = [];
  for (const payment of sdp.payments) {
    const lineItem = lineItems.find((item) => item.id === payment.lineItemId);
    if (!lineItem) continue;
    if (!expectedUsdcIssuer) {
      verificationEvents.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "error",
        externalId: payment.transactionHash,
        message: "Missing STELLAR_USDC_ISSUER for USDC proof verification",
      });
      continue;
    }

    try {
      const proof = await verifyStellarUsdcPayment({
        transactionHash: payment.transactionHash,
        expectedAmount: Number(lineItem.amount_usdc),
        expectedIssuer: expectedUsdcIssuer,
        expectedDestination: destination.walletAddress,
        horizonUrl,
      });
      verifiedPayments.set(payment.lineItemId, {
        transactionHash: payment.transactionHash,
        assetCode: proof.assetCode,
        assetIssuer: proof.assetIssuer,
        assetAmount: proof.assetAmount,
      });
      verificationEvents.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "ok",
        externalId: payment.transactionHash,
        message: "Verified USDC payment proof",
      });
    } catch (error) {
      verificationEvents.push({
        provider: "stellar-sdp",
        action: "sync_status",
        status: "error",
        externalId: payment.transactionHash,
        message:
          error instanceof StellarProofError
            ? error.message
            : "USDC payment proof verification failed",
      });
    }
  }

  const updates = await Promise.all(
    lineItems.map((lineItem) => {
      const payment = verifiedPayments.get(lineItem.id);
      return supabase
        .from("batch_line_items")
        .update({
          status: payment ? "settled" : "processing",
          transaction_hash: payment?.transactionHash ?? null,
          payment_asset_code: payment?.assetCode ?? null,
          payment_asset_issuer: payment?.assetIssuer ?? null,
          payment_asset_amount: payment?.assetAmount ?? null,
        })
        .eq("id", lineItem.id);
    }),
  );
  if (updates.some((result) => result.error)) {
    redirectWithStatus("/admin/batches", "line-item-error");
  }

  const allSettled = lineItems.every((lineItem) => verifiedPayments.has(lineItem.id));
  const { error } = await supabase
    .from("funding_batches")
    .update({
      status: allSettled ? "settled" : "submitted",
      settled_at: allSettled ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "submitted");
  if (error) redirectWithStatus("/admin/batches", "error");

  if (allSettled) {
    await supabase
      .from("funding_allocations")
      .update({ status: "settled" })
      .eq("batch_id", parsed.data.entityId);
    await supabase
      .from("reconciliation_items")
      .update({ status: "reconciled", reconciled_at: new Date().toISOString() })
      .eq("batch_id", parsed.data.entityId)
      .eq("status", "receipt_attached");
  }
  await insertSdpEvents(supabase, parsed.data.entityId, [
    ...sdp.events,
    ...verificationEvents,
  ]);

  await insertAudit(supabase, session, {
    action: "batch.synced",
    entityType: "batch",
    entityId: parsed.data.entityId,
    after: { status: allSettled ? "settled" : "submitted" },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/batches");
  redirectWithStatus("/admin/batches", "batch-synced");
}

async function promoteApplication(
  supabase: SupabaseClient,
  application: ApplicationRow,
) {
  const trackSlug = slugify(application.proposed_track_name);
  const initiativeSlug = slugify(application.proposed_initiative_name);
  const initiativeCode = `AYRA-${trackSlug.slice(0, 3).toUpperCase()}-${initiativeSlug
    .replaceAll("-", "")
    .slice(0, 18)
    .toUpperCase()}`;

  const { data: track, error: trackError } = await supabase
    .from("tracks")
    .upsert(
      {
        slug: trackSlug,
        name: application.proposed_track_name,
        local_currency: "COP",
        theme: "Community stewardship",
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();
  if (trackError || !track) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .upsert(
      {
        email: application.applicant_email,
        display_name: application.applicant_name,
      },
      { onConflict: "email" },
    )
    .select("id")
    .single();
  if (profileError || !profile) return null;

  const { data: initiative, error: initiativeError } = await supabase
    .from("initiatives")
    .upsert(
      {
        track_id: track.id,
        code: initiativeCode,
        slug: initiativeSlug,
        name: application.proposed_initiative_name,
        headline: application.scope_summary,
        description: application.operational_notes,
        steward_name: application.applicant_name,
        league_score: 50,
        target_metric_label: "Milestone progress",
        target_metric_current: 0,
        target_metric_goal: 100,
        status: "funding",
      },
      { onConflict: "track_id,slug" },
    )
    .select("id")
    .single();
  if (initiativeError || !initiative) return null;

  const granteeName = `${application.proposed_initiative_name} operations`;
  const { data: grantee, error: granteeError } = await supabase
    .from("grantees")
    .insert({
      initiative_id: initiative.id,
      name: granteeName,
      contact_profile_id: profile.id,
    })
    .select("id")
    .single();
  if (granteeError || !grantee) return null;

  const inserts = await Promise.all([
    supabase.from("steward_profiles").upsert(
      {
        profile_id: profile.id,
        initiative_id: initiative.id,
        organisation_name: granteeName,
        public_contact_name: application.applicant_name,
        private_phone: application.contact_signal,
      },
      { onConflict: "profile_id,initiative_id" },
    ),
    supabase.from("grantee_contacts").upsert(
      {
        profile_id: profile.id,
        grantee_id: grantee.id,
      },
      { onConflict: "profile_id,grantee_id" },
    ),
    supabase.from("user_roles").insert([
      {
        profile_id: profile.id,
        role: "steward",
        initiative_id: initiative.id,
      },
      {
        profile_id: profile.id,
        role: "grantee_contact",
        grantee_id: grantee.id,
      },
    ]),
    supabase.from("milestones").upsert(
      applicationMilestones(application).map((title, index) => ({
        initiative_id: initiative.id,
        code: `M${String(index + 1).padStart(2, "0")}`,
        title,
        percent_complete: 0,
        status: index === 0 ? "active" : "planned",
      })),
      { onConflict: "initiative_id,code" },
    ),
  ]);

  if (inserts.some((result) => result.error)) return null;
  return { initiativeId: initiative.id as string, profileId: profile.id as string };
}

function applicationMilestones(application: ApplicationRow) {
  return application.milestone_plan?.length
    ? application.milestone_plan
    : [...DEFAULT_APPLICATION_MILESTONES];
}

async function initiativeHasVerifiedAddress(
  supabase: SupabaseClient,
  initiativeId: string,
) {
  const { data, error } = await supabase
    .from("payout_addresses")
    .select("id")
    .eq("initiative_id", initiativeId)
    .in("status", ["verified", "locked"])
    .limit(1)
    .maybeSingle();
  return !error && Boolean(data);
}

async function approvedMilestoneSubmissionAvailable(
  supabase: SupabaseClient,
  initiativeId: string,
  milestoneSubmissionId: string | null | undefined,
) {
  if (!milestoneSubmissionId) return false;
  const { data: submission, error: submissionError } = await supabase
    .from("milestone_submissions")
    .select("id")
    .eq("id", milestoneSubmissionId)
    .eq("initiative_id", initiativeId)
    .eq("status", "approved")
    .maybeSingle();
  if (submissionError || !submission) return false;

  const { data: linked, error: linkedError } = await supabase
    .from("funding_batches")
    .select("id")
    .eq("milestone_submission_id", milestoneSubmissionId)
    .limit(1)
    .maybeSingle();
  return !linkedError && !linked;
}

async function loadSdpDestination(
  supabase: SupabaseClient,
  initiativeId: string,
) {
  const { data: address, error: addressError } = await supabase
    .from("payout_addresses")
    .select("address")
    .eq("initiative_id", initiativeId)
    .in("status", ["verified", "locked"])
    .limit(1)
    .maybeSingle();
  if (addressError || !address?.address) return null;

  const { data: grantee } = await supabase
    .from("grantees")
    .select("contact_profile_id")
    .eq("initiative_id", initiativeId)
    .not("contact_profile_id", "is", null)
    .limit(1)
    .maybeSingle();

  let receiverEmail = `receiver+${initiativeId}@ayra.example.org`;
  if (grantee?.contact_profile_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", grantee.contact_profile_id)
      .maybeSingle();
    if (profile?.email) receiverEmail = profile.email;
  }

  return {
    receiverEmail,
    walletAddress: address.address as string,
    walletAddressMemo: null,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
