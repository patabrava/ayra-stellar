"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { canSubmitForMilestone } from "@/lib/ayra/auth";
import {
  createPublicSupabaseClient,
  hasPublicSupabaseEnv,
} from "@/lib/ayra/data";
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
import { createSupabaseServerClient } from "@/lib/supabase/server";

const applicationSchema = z.object({
  applicantName: z.string().trim().min(2),
  applicantEmail: z.string().trim().email(),
  proposedTrackName: z.string().trim().min(2),
  proposedInitiativeName: z.string().trim().min(2),
  scopeSummary: z.string().trim().min(20),
  operationalNotes: z.string().trim().min(10),
  contactSignal: z.string().trim().min(5),
});

const updateSchema = z.object({
  milestoneId: z.string().trim().min(1),
  caption: z.string().trim().min(20),
  mediaUrl: z.string().trim().optional(),
  mediaAlt: z.string().trim().optional(),
});

const idActionSchema = z.object({
  entityId: z.string().trim().min(1),
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
  amountUsdc: z.coerce.number().positive(),
  localAmount: z.coerce.number().nonnegative(),
  localCurrency: z.enum(["COP", "USD"]),
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

export async function requestMagicLinkAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: text(formData, "email"),
    next: optionalText(formData, "next"),
  });
  if (!parsed.success) redirectWithStatus("/login", "invalid");
  if (!hasPublicSupabaseEnv()) redirectWithStatus("/login", "supabase-not-configured");

  const next = safeNextPath(parsed.data.next, "/admin");
  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      shouldCreateUser: true,
    },
  });

  redirect(loginPath(next, error ? "link-error" : "link-sent"));
}

export async function signOutAction() {
  if (hasPublicSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirectWithStatus("/login", "signed-out");
}

export async function submitApplicationAction(formData: FormData) {
  const parsed = applicationSchema.safeParse({
    applicantName: text(formData, "applicantName"),
    applicantEmail: text(formData, "applicantEmail"),
    proposedTrackName: text(formData, "proposedTrackName"),
    proposedInitiativeName: text(formData, "proposedInitiativeName"),
    scopeSummary: text(formData, "scopeSummary"),
    operationalNotes: text(formData, "operationalNotes"),
    contactSignal: text(formData, "contactSignal"),
  });

  if (!parsed.success) redirectWithStatus("/apply", "invalid");
  if (!hasPublicSupabaseEnv()) demoRedirect("/apply", "submitted");

  const supabase = createPublicSupabaseClient();
  const { error } = await supabase.from("applications").insert({
    applicant_name: parsed.data.applicantName,
    applicant_email: parsed.data.applicantEmail,
    proposed_track_name: parsed.data.proposedTrackName,
    proposed_initiative_name: parsed.data.proposedInitiativeName,
    scope_summary: parsed.data.scopeSummary,
    operational_notes: parsed.data.operationalNotes,
    contact_signal: parsed.data.contactSignal,
    status: "pending",
  });
  if (error) redirectWithStatus("/apply", "error");

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
  const { data, error } = await supabase
    .from("initiative_updates")
    .insert({
      initiative_id: milestone.initiativeId,
      milestone_id: milestone.id,
      submitted_by_profile_id: session.context.profile.id,
      source,
      caption: parsed.data.caption,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) redirectWithStatus("/steward", "error");

  const mediaFile = optionalFile(formData, "mediaFile");
  let mediaUrl = parsed.data.mediaUrl;
  if (mediaFile) {
    const name = safeStorageName(mediaFile.name || "update-media");
    const path = `updates/${data.id}/${Date.now()}-${name}`;
    const uploaded = await uploadFile(
      supabase,
      "ayra-public-update-media",
      path,
      mediaFile,
    );
    if (!uploaded) redirectWithStatus("/steward", "media-error");
    mediaUrl = publicStorageUrl(supabase, "ayra-public-update-media", uploaded);
  }

  if (mediaUrl) {
    const media = await supabase.from("update_media").insert({
      update_id: data.id,
      kind: "image",
      url: mediaUrl,
      alt: parsed.data.mediaAlt ?? "Submitted update media",
      public_ready: false,
    });
    if (media.error) redirectWithStatus("/steward", "media-error");
  }

  await insertAudit(supabase, session, {
    action: "update.submitted",
    entityType: "initiative_update",
    entityId: data.id,
    after: { status: "pending" },
  });
  revalidatePath("/admin");
  redirectWithStatus("/steward", "update-submitted");
}

export async function approveApplicationAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "applicationId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "application-approved");

  const supabase = session.supabase!;
  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .select(
      "id,applicant_name,applicant_email,proposed_track_name,proposed_initiative_name,scope_summary,operational_notes,contact_signal",
    )
    .eq("id", parsed.data.entityId)
    .eq("status", "pending")
    .single();
  if (applicationError || !application) redirectWithStatus("/admin", "error");

  const promoted = await promoteApplication(supabase, application as ApplicationRow);
  if (!promoted) redirectWithStatus("/admin", "promotion-error");

  const { error } = await supabase
    .from("applications")
    .update({
      status: "approved",
      decided_by_profile_id: session.context.profile.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "pending");
  if (error) redirectWithStatus("/admin", "error");

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
  redirectWithStatus("/admin", "application-approved");
}

export async function verifyPayoutAddressAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "payoutAddressId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "payout-verified");

  const supabase = session.supabase!;
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
  if (error) redirectWithStatus("/admin", "error");

  await insertAudit(supabase, session, {
    action: "payout_address.verified",
    entityType: "payout_address",
    entityId: parsed.data.entityId,
    after: { status: "verified" },
  });
  revalidatePath("/admin");
  redirectWithStatus("/admin", "payout-verified");
}

export async function moderateUpdateAction(formData: FormData) {
  const parsed = moderateSchema.safeParse({
    entityId: text(formData, "updateId"),
    action: text(formData, "action"),
    publicCaption: optionalText(formData, "publicCaption"),
    sanitizedFeedback: optionalText(formData, "sanitizedFeedback"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "update-moderated");

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
  if (error) redirectWithStatus("/admin", "error");

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
  redirectWithStatus("/admin", "update-moderated");
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
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "batch-created");

  const supabase = session.supabase!;
  const hasVerifiedAddress = await initiativeHasVerifiedAddress(
    supabase,
    parsed.data.initiativeId,
  );
  if (!hasVerifiedAddress) redirectWithStatus("/admin", "payout-required");

  const { data, error } = await supabase
    .from("funding_batches")
    .insert({
      initiative_id: parsed.data.initiativeId,
      sponsor_id: parsed.data.sponsorId ?? null,
      code: parsed.data.code,
      period_label: parsed.data.periodLabel,
      status: "ready",
      created_by_profile_id: session.context.profile.id,
    })
    .select("id")
    .single();
  if (error) redirectWithStatus("/admin", "error");

  const lineItem = await supabase
    .from("batch_line_items")
    .insert({
      batch_id: data.id,
      category: parsed.data.category,
      amount_usdc: parsed.data.amountUsdc,
      local_amount: parsed.data.localAmount,
      local_currency: parsed.data.localCurrency,
      status: "draft",
    })
    .select("id")
    .single();
  if (lineItem.error || !lineItem.data) redirectWithStatus("/admin", "line-item-error");

  const allocation = await supabase.from("funding_allocations").insert({
    initiative_id: parsed.data.initiativeId,
    sponsor_id: parsed.data.sponsorId ?? null,
    batch_id: data.id,
    category: parsed.data.category,
    amount_usdc: parsed.data.amountUsdc,
    local_amount: parsed.data.localAmount,
    local_currency: parsed.data.localCurrency,
    status: "batched",
    notes: "Created from admin one-line batch form.",
    created_by_profile_id: session.context.profile.id,
  });
  if (allocation.error) redirectWithStatus("/admin", "allocation-error");

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
    if (!privateReceiptPath) redirectWithStatus("/admin", "receipt-error");
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
  if (reconciliation.error) redirectWithStatus("/admin", "reconciliation-error");

  await insertAudit(supabase, session, {
    action: "batch.created",
    entityType: "batch",
    entityId: data.id,
    after: { status: "ready" },
  });
  revalidatePath("/admin");
  redirectWithStatus("/admin", "batch-created");
}

export async function submitBatchAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "batchId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "batch-submitted");

  const supabase = session.supabase!;
  const { data: batch, error: batchError } = await supabase
    .from("funding_batches")
    .select("id,initiative_id,code,sdp_batch_id")
    .eq("id", parsed.data.entityId)
    .eq("status", "ready")
    .single();
  if (batchError || !batch) redirectWithStatus("/admin", "error");

  const hasVerifiedAddress = await initiativeHasVerifiedAddress(
    supabase,
    batch.initiative_id,
  );
  if (!hasVerifiedAddress) redirectWithStatus("/admin", "payout-required");

  const { data: lineItems, error: lineItemReadError } = await supabase
    .from("batch_line_items")
    .select("id,category,amount_usdc")
    .eq("batch_id", parsed.data.entityId);
  if (lineItemReadError || !lineItems || lineItems.length === 0) {
    redirectWithStatus("/admin", "line-item-error");
  }

  const destination = await loadSdpDestination(supabase, batch.initiative_id);
  if (!destination) redirectWithStatus("/admin", "payout-required");

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
    redirectWithStatus("/admin", "sdp-error");
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
  if (error) redirectWithStatus("/admin", "error");

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
    redirectWithStatus("/admin", "line-item-error");
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
  redirectWithStatus("/admin", "batch-submitted");
}

export async function syncBatchStatusAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    entityId: text(formData, "batchId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");

  const session = await requireAdminSession("/admin");
  if (session.isDemo) demoRedirect("/admin", "batch-synced");

  const supabase = session.supabase!;
  const { data: batch, error: batchError } = await supabase
    .from("funding_batches")
    .select("id,initiative_id,code,sdp_batch_id")
    .eq("id", parsed.data.entityId)
    .eq("status", "submitted")
    .single();
  if (batchError || !batch) redirectWithStatus("/admin", "error");

  const { data: lineItems, error: lineItemError } = await supabase
    .from("batch_line_items")
    .select("id,category,amount_usdc")
    .eq("batch_id", parsed.data.entityId);
  if (lineItemError || !lineItems || lineItems.length === 0) {
    redirectWithStatus("/admin", "line-item-error");
  }

  const destination = await loadSdpDestination(supabase, batch.initiative_id);
  if (!destination) redirectWithStatus("/admin", "payout-required");

  const gateway = createSdpGateway();
  let sdp;
  try {
    sdp = await gateway.syncStatus(
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
    redirectWithStatus("/admin", "sdp-error");
  }

  const settledLineItemIds = new Set(sdp.payments.map((payment) => payment.lineItemId));
  const updates = await Promise.all(
    lineItems.map((lineItem) => {
      const payment = sdp.payments.find((item) => item.lineItemId === lineItem.id);
      return supabase
        .from("batch_line_items")
        .update({
          status: settledLineItemIds.has(lineItem.id) ? "settled" : "processing",
          transaction_hash: payment?.transactionHash ?? null,
        })
        .eq("id", lineItem.id);
    }),
  );
  if (updates.some((result) => result.error)) {
    redirectWithStatus("/admin", "line-item-error");
  }

  const allSettled = lineItems.every((lineItem) => settledLineItemIds.has(lineItem.id));
  const { error } = await supabase
    .from("funding_batches")
    .update({
      status: allSettled ? "settled" : "submitted",
      settled_at: allSettled ? new Date().toISOString() : null,
    })
    .eq("id", parsed.data.entityId)
    .eq("status", "submitted");
  if (error) redirectWithStatus("/admin", "error");

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
  await insertSdpEvents(supabase, parsed.data.entityId, sdp.events);

  await insertAudit(supabase, session, {
    action: "batch.synced",
    entityType: "batch",
    entityId: parsed.data.entityId,
    after: { status: allSettled ? "settled" : "submitted" },
  });
  revalidatePath("/");
  revalidatePath("/admin");
  redirectWithStatus("/admin", "batch-synced");
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
      {
        initiative_id: initiative.id,
        code: "M01",
        title: "Setup and address verification",
        percent_complete: 0,
        status: "active",
      },
      { onConflict: "initiative_id,code" },
    ),
  ]);

  if (inserts.some((result) => result.error)) return null;
  return { initiativeId: initiative.id as string, profileId: profile.id as string };
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
