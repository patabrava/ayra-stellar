"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createSupabaseAdminClient,
  hasSupabaseAdminEnv,
} from "@/lib/supabase/admin";
import {
  createPublicSupabaseClient,
  hasPublicSupabaseEnv,
} from "@/lib/ayra/data";

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
  actorProfileId: z.string().trim().min(1),
  initiativeId: z.string().trim().min(1),
  milestoneId: z.string().trim().min(1),
  caption: z.string().trim().min(20),
  mediaUrl: z.string().trim().optional(),
  mediaAlt: z.string().trim().optional(),
});

const idActionSchema = z.object({
  actorProfileId: z.string().trim().min(1),
  entityId: z.string().trim().min(1),
});

const moderateSchema = idActionSchema.extend({
  action: z.enum(["approve", "edit-and-approve", "reject", "save draft"]),
  publicCaption: z.string().trim().optional(),
  sanitizedFeedback: z.string().trim().optional(),
});

const batchSchema = z.object({
  actorProfileId: z.string().trim().min(1),
  initiativeId: z.string().trim().min(1),
  code: z.string().trim().min(4),
  periodLabel: z.string().trim().min(4),
  sponsorId: z.string().trim().optional(),
  category: z.string().trim().min(2),
  amountUsdc: z.coerce.number().positive(),
  localAmount: z.coerce.number().nonnegative(),
  localCurrency: z.enum(["COP", "USD"]),
});

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optionalText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value.length > 0 ? value : undefined;
}

function redirectWithStatus(path: string, status: string): never {
  redirect(`${path}?status=${encodeURIComponent(status)}`);
}

function isUuid(value: string | undefined) {
  return Boolean(
    value?.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    ),
  );
}

function canWriteIds(values: Array<string | undefined>) {
  return hasSupabaseAdminEnv() && values.every((value) => !value || isUuid(value));
}

async function insertAudit(input: {
  actorProfileId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  after?: Record<string, unknown>;
}) {
  if (!hasSupabaseAdminEnv()) return;
  const supabase = createSupabaseAdminClient();
  await supabase.from("audit_logs").insert({
    actor_profile_id: input.actorProfileId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    after_summary: input.after ?? null,
  });
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

  const canWritePublicApplication = hasSupabaseAdminEnv() || hasPublicSupabaseEnv();

  if (canWritePublicApplication) {
    const supabase = hasSupabaseAdminEnv()
      ? createSupabaseAdminClient()
      : createPublicSupabaseClient();
    const applicationInsert = {
      applicant_name: parsed.data.applicantName,
      applicant_email: parsed.data.applicantEmail,
      proposed_track_name: parsed.data.proposedTrackName,
      proposed_initiative_name: parsed.data.proposedInitiativeName,
      scope_summary: parsed.data.scopeSummary,
      operational_notes: parsed.data.operationalNotes,
      contact_signal: parsed.data.contactSignal,
      status: "pending",
    };
    const { data, error } = hasSupabaseAdminEnv()
      ? await supabase
          .from("applications")
          .insert(applicationInsert)
          .select("id")
          .single()
      : await supabase.from("applications").insert(applicationInsert);
    if (error) redirectWithStatus("/apply", "error");
    if (hasSupabaseAdminEnv() && data) {
      await insertAudit({
        action: "application.submitted",
        entityType: "application",
        entityId: data.id,
        after: { status: "pending" },
      });
    }
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/apply",
    canWritePublicApplication ? "submitted" : "demo-submitted",
  );
}

export async function submitUpdateAction(formData: FormData) {
  const parsed = updateSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
    initiativeId: text(formData, "initiativeId"),
    milestoneId: text(formData, "milestoneId"),
    caption: text(formData, "caption"),
    mediaUrl: optionalText(formData, "mediaUrl"),
    mediaAlt: optionalText(formData, "mediaAlt"),
  });
  if (!parsed.success) redirectWithStatus("/steward", "invalid");
  const shouldWrite = canWriteIds([
    parsed.data.actorProfileId,
    parsed.data.initiativeId,
    parsed.data.milestoneId,
  ]);

  if (shouldWrite) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("initiative_updates")
      .insert({
        initiative_id: parsed.data.initiativeId,
        milestone_id: parsed.data.milestoneId,
        submitted_by_profile_id: parsed.data.actorProfileId,
        source: "steward",
        caption: parsed.data.caption,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) redirectWithStatus("/steward", "error");
    if (parsed.data.mediaUrl) {
      await supabase.from("update_media").insert({
        update_id: data.id,
        kind: "image",
        url: parsed.data.mediaUrl,
        alt: parsed.data.mediaAlt ?? "Submitted update media",
        public_ready: true,
      });
    }
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: "update.submitted",
      entityType: "initiative_update",
      entityId: data.id,
      after: { status: "pending" },
    });
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/steward",
    shouldWrite ? "update-submitted" : "demo-update-submitted",
  );
}

export async function approveApplicationAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
    entityId: text(formData, "applicationId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");
  const shouldWrite = canWriteIds([parsed.data.actorProfileId, parsed.data.entityId]);

  if (shouldWrite) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("applications")
      .update({
        status: "approved",
        decided_by_profile_id: parsed.data.actorProfileId,
        decided_at: new Date().toISOString(),
      })
      .eq("id", parsed.data.entityId)
      .eq("status", "pending");
    if (error) redirectWithStatus("/admin", "error");
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: "application.approved",
      entityType: "application",
      entityId: parsed.data.entityId,
      after: { status: "approved" },
    });
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/admin",
    shouldWrite ? "application-approved" : "demo-application-approved",
  );
}

export async function verifyPayoutAddressAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
    entityId: text(formData, "payoutAddressId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");
  const shouldWrite = canWriteIds([parsed.data.actorProfileId, parsed.data.entityId]);

  if (shouldWrite) {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("payout_addresses")
      .update({
        status: "verified",
        verified_by_profile_id: parsed.data.actorProfileId,
        verified_at: new Date().toISOString(),
        verification_note:
          optionalText(formData, "verificationNote") ?? "Manual v1 verification.",
      })
      .eq("id", parsed.data.entityId);
    if (error) redirectWithStatus("/admin", "error");
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: "payout_address.verified",
      entityType: "payout_address",
      entityId: parsed.data.entityId,
      after: { status: "verified" },
    });
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/admin",
    shouldWrite ? "payout-verified" : "demo-payout-verified",
  );
}

export async function moderateUpdateAction(formData: FormData) {
  const parsed = moderateSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
    entityId: text(formData, "updateId"),
    action: text(formData, "action"),
    publicCaption: optionalText(formData, "publicCaption"),
    sanitizedFeedback: optionalText(formData, "sanitizedFeedback"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");
  const shouldWrite = canWriteIds([parsed.data.actorProfileId, parsed.data.entityId]);

  if (shouldWrite) {
    const status =
      parsed.data.action === "reject"
        ? "rejected"
        : parsed.data.action === "save draft"
          ? "draft"
          : "approved";
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase
      .from("initiative_updates")
      .update({
        status,
        public_caption: parsed.data.publicCaption,
        sanitized_feedback: parsed.data.sanitizedFeedback,
        moderated_by_profile_id: parsed.data.actorProfileId,
        published_at: status === "approved" ? new Date().toISOString() : null,
      })
      .eq("id", parsed.data.entityId);
    if (error) redirectWithStatus("/admin", "error");
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: `update.${parsed.data.action.replaceAll(" ", "_")}`,
      entityType: "initiative_update",
      entityId: parsed.data.entityId,
      after: { status },
    });
    revalidatePath("/");
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/admin",
    shouldWrite ? "update-moderated" : "demo-update-moderated",
  );
}

export async function createBatchAction(formData: FormData) {
  const parsed = batchSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
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
  const shouldWrite = canWriteIds([
    parsed.data.actorProfileId,
    parsed.data.initiativeId,
    parsed.data.sponsorId,
  ]);

  if (shouldWrite) {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("funding_batches")
      .insert({
        initiative_id: parsed.data.initiativeId,
        sponsor_id: parsed.data.sponsorId ?? null,
        code: parsed.data.code,
        period_label: parsed.data.periodLabel,
        status: "ready",
        created_by_profile_id: parsed.data.actorProfileId,
      })
      .select("id")
      .single();
    if (error) redirectWithStatus("/admin", "error");
    await supabase.from("batch_line_items").insert({
      batch_id: data.id,
      category: parsed.data.category,
      amount_usdc: parsed.data.amountUsdc,
      local_amount: parsed.data.localAmount,
      local_currency: parsed.data.localCurrency,
      status: "draft",
    });
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: "batch.created",
      entityType: "batch",
      entityId: data.id,
      after: { status: "ready" },
    });
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/admin",
    shouldWrite ? "batch-created" : "demo-batch-created",
  );
}

export async function submitBatchAction(formData: FormData) {
  const parsed = idActionSchema.safeParse({
    actorProfileId: text(formData, "actorProfileId"),
    entityId: text(formData, "batchId"),
  });
  if (!parsed.success) redirectWithStatus("/admin", "invalid");
  const shouldWrite = canWriteIds([parsed.data.actorProfileId, parsed.data.entityId]);

  if (shouldWrite) {
    const supabase = createSupabaseAdminClient();
    const sdpBatchId = `mock-sdp-${parsed.data.entityId}`;
    const { error } = await supabase
      .from("funding_batches")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        sdp_batch_id: sdpBatchId,
      })
      .eq("id", parsed.data.entityId)
      .eq("status", "ready");
    if (error) redirectWithStatus("/admin", "error");
    await supabase
      .from("batch_line_items")
      .update({ status: "submitted" })
      .eq("batch_id", parsed.data.entityId);
    await insertAudit({
      actorProfileId: parsed.data.actorProfileId,
      action: "batch.submitted",
      entityType: "batch",
      entityId: parsed.data.entityId,
      after: { status: "submitted", sdpBatchId },
    });
    revalidatePath("/");
    revalidatePath("/admin");
  }

  redirectWithStatus(
    "/admin",
    shouldWrite ? "batch-submitted" : "demo-batch-submitted",
  );
}
