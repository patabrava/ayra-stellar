import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import WebSocket from "ws";

import {
  createSupabaseAdminClient,
  hasSupabaseAdminEnv,
} from "@/lib/supabase/admin";
import {
  createDemoState,
  type Application,
  type AuditLog,
  type AyraState,
  type Batch,
  type BatchLineItem,
  type BatchStatus,
  type FundingAllocation,
  type Grantee,
  type GranteeContact,
  type Initiative,
  type InitiativeUpdate,
  type Milestone,
  type PayoutAddress,
  type PayoutAddressStatus,
  type Profile,
  type Role,
  type ReconciliationItem,
  type SdpSyncEvent,
  type Sponsor,
  type StewardProfile,
  type Track,
  type UpdateMedia,
  type UpdateStatus,
  type UserRole,
} from "@/lib/ayra/domain";

type PublicRows = {
  tracks: TrackRow[];
  sponsors: SponsorRow[];
  initiatives: InitiativeRow[];
  milestones: MilestoneRow[];
  updates: UpdateRow[];
  media: MediaRow[];
  batches: BatchRow[];
  receipts: ReceiptRow[];
};

type OperatorRows = PublicRows & {
  profiles: ProfileRow[];
  userRoles: UserRoleRow[];
  applications: ApplicationRow[];
  stewardProfiles: StewardProfileRow[];
  grantees: GranteeRow[];
  granteeContacts: GranteeContactRow[];
  payoutAddresses: PayoutAddressRow[];
  lineItems?: LineItemRow[];
  fundingAllocations: FundingAllocationRow[];
  reconciliationItems: ReconciliationRow[];
  sdpSyncEvents: SdpSyncEventRow[];
  auditLogs: AuditLogRow[];
};

type AyraSupabaseClient = Pick<SupabaseClient, "from">;

const canonicalTrackNames: Record<string, string> = {
  providencia: "Providencia",
  amazonas: "Futuromundo",
};

type TrackRow = {
  id: string;
  slug: string;
  name: string;
  local_currency: string;
  theme: string;
};

type SponsorRow = {
  id: string;
  slug: string;
  name: string;
  public_attribution: string | null;
};

type InitiativeRow = {
  id: string;
  track_id: string;
  sponsor_id: string | null;
  code: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  steward_name: string | null;
  league_score: number | string;
  target_metric_label: string;
  target_metric_current: number | string;
  target_metric_goal: number | string;
  status: string;
};

type MilestoneRow = {
  id: string;
  initiative_id: string;
  code: string;
  title: string;
  percent_complete: number | string;
  status: string;
};

type UpdateRow = {
  id: string;
  initiative_id: string;
  milestone_id: string;
  submitted_by_profile_id: string;
  source: string;
  caption: string;
  public_caption: string | null;
  status: string;
  internal_initials: string | null;
  submitted_at: string;
  published_at: string | null;
  moderated_by_profile_id: string | null;
  sanitized_feedback: string | null;
};

type MediaRow = {
  update_id: string;
  kind: string;
  url: string;
  alt: string;
  public_ready: boolean;
};

type BatchRow = {
  id: string;
  initiative_id: string;
  sponsor_id: string | null;
  code: string;
  period_label: string;
  status: string;
  created_by_profile_id: string;
  created_at: string;
  submitted_at: string | null;
  settled_at: string | null;
  sdp_batch_id: string | null;
};

type ReceiptRow = {
  line_item_id: string | null;
  batch_id: string;
  batch_code: string;
  period_label: string;
  batch_status: string;
  initiative_name: string;
  sponsor_name: string | null;
  category: string;
  amount_usdc: number | string;
  local_amount: number | string;
  local_currency: string;
  line_item_status: string | null;
  transaction_hash: string | null;
  payment_asset_code: string | null;
  payment_asset_issuer: string | null;
  payment_asset_amount: number | string | null;
};

type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
};

type UserRoleRow = {
  id: string;
  profile_id: string;
  role: string;
  initiative_id: string | null;
  grantee_id: string | null;
};

type ApplicationRow = {
  id: string;
  applicant_profile_id: string | null;
  applicant_name: string;
  applicant_email: string;
  proposed_track_name: string;
  proposed_initiative_name: string;
  scope_summary: string;
  operational_notes: string;
  contact_signal: string;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  decided_by_profile_id: string | null;
};

type StewardProfileRow = {
  id: string;
  profile_id: string;
  initiative_id: string;
  organisation_name: string;
  public_contact_name: string;
  private_phone: string | null;
};

type GranteeRow = {
  id: string;
  initiative_id: string;
  name: string;
  contact_profile_id: string | null;
};

type GranteeContactRow = {
  id: string;
  profile_id: string;
  grantee_id: string;
};

type PayoutAddressRow = {
  id: string;
  initiative_id: string;
  address: string;
  status: string;
  submitted_by_profile_id: string;
  submitted_at: string;
  verified_at: string | null;
  verified_by_profile_id: string | null;
  locked_at: string | null;
  verification_note: string | null;
};

type LineItemRow = {
  id: string;
  batch_id: string;
  category: string;
  amount_usdc: number | string;
  local_amount: number | string;
  local_currency: string;
  status: string;
  sdp_payment_id: string | null;
  transaction_hash: string | null;
  payment_asset_code: string | null;
  payment_asset_issuer: string | null;
  payment_asset_amount: number | string | null;
  private_recipient_name: string | null;
};

type FundingAllocationRow = {
  id: string;
  initiative_id: string;
  sponsor_id: string | null;
  batch_id: string | null;
  category: string;
  amount_usdc: number | string;
  local_amount: number | string;
  local_currency: string;
  status: string;
  notes: string | null;
  created_by_profile_id: string;
  created_at: string;
};

type ReconciliationRow = {
  id: string;
  batch_id: string;
  line_item_id: string;
  status: string;
  private_receipt_path: string | null;
  note: string | null;
  created_by_profile_id: string;
  created_at: string;
  reconciled_at: string | null;
};

type SdpSyncEventRow = {
  id: string;
  batch_id: string;
  provider: string;
  action: string;
  status: string;
  external_id: string | null;
  message: string | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_profile_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_summary: Record<string, unknown> | null;
  after_summary: Record<string, unknown> | null;
  created_at: string;
};

export function hasPublicSupabaseEnv() {
  if (process.env.AYRA_DEMO_MODE === "1") return false;
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function createPublicSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: WebSocket as unknown as typeof globalThis.WebSocket,
      },
    },
  );
}

export async function loadPublicAyraState() {
  if (!hasPublicSupabaseEnv()) return createDemoState();

  return loadPublicAyraStateFromClient(createPublicSupabaseClient(), {
    fallbackToDemo: true,
  });
}

export async function loadStrictPublicAyraState() {
  if (!hasPublicSupabaseEnv()) {
    throw new Error("Public Supabase environment is not configured.");
  }

  return loadPublicAyraStateFromClient(createPublicSupabaseClient(), {
    fallbackToDemo: false,
  });
}

export async function loadOperatorAyraState() {
  if (!hasSupabaseAdminEnv()) return createDemoState();

  return loadOperatorAyraStateFromClient(createSupabaseAdminClient(), {
    fallbackToDemo: true,
  });
}

async function loadPublicAyraStateFromClient(
  supabase: AyraSupabaseClient,
  { fallbackToDemo }: { fallbackToDemo: boolean },
) {
  const [
    tracks,
    sponsors,
    initiatives,
    milestones,
    updates,
    media,
    batches,
    receipts,
  ] = await Promise.all([
    supabase
      .from("tracks")
      .select("id,slug,name,local_currency,theme")
      .order("name"),
    supabase
      .from("sponsors")
      .select("id,slug,name,public_attribution")
      .order("name"),
    supabase
      .from("initiatives")
      .select(
        "id,track_id,sponsor_id,code,slug,name,headline,description,steward_name,league_score,target_metric_label,target_metric_current,target_metric_goal,status",
      )
      .order("created_at"),
    supabase
      .from("milestones")
      .select("id,initiative_id,code,title,percent_complete,status")
      .order("code"),
    supabase
      .from("initiative_updates")
      .select(
        "id,initiative_id,milestone_id,submitted_by_profile_id,source,caption,public_caption,status,internal_initials,submitted_at,published_at,moderated_by_profile_id,sanitized_feedback",
      )
      .eq("status", "approved")
      .order("published_at", { ascending: false }),
    supabase
      .from("update_media")
      .select("update_id,kind,url,alt,public_ready")
      .eq("public_ready", true),
    supabase
      .from("funding_batches")
      .select(
        "id,initiative_id,sponsor_id,code,period_label,status,created_by_profile_id,created_at,submitted_at,settled_at,sdp_batch_id",
      )
      .in("status", ["submitted", "settled"])
      .order("created_at", { ascending: false }),
    supabase
      .from("public_batch_receipts")
      .select(
        "line_item_id,batch_id,batch_code,period_label,batch_status,initiative_name,sponsor_name,category,amount_usdc,local_amount,local_currency,line_item_status,transaction_hash,payment_asset_code,payment_asset_issuer,payment_asset_amount",
      ),
  ]);

  if (
    tracks.error ||
    sponsors.error ||
    initiatives.error ||
    milestones.error ||
    updates.error ||
    media.error ||
    batches.error ||
    receipts.error
  ) {
    if (fallbackToDemo) {
      console.error(
        "Falling back to AYRA demo state after public Supabase read failure.",
      );
      return createDemoState();
    }

    throw new Error("Public Supabase read failed.");
  }

  return stateFromPublicRows({
    tracks: (tracks.data ?? []) as TrackRow[],
    sponsors: (sponsors.data ?? []) as SponsorRow[],
    initiatives: (initiatives.data ?? []) as InitiativeRow[],
    milestones: (milestones.data ?? []) as MilestoneRow[],
    updates: (updates.data ?? []) as UpdateRow[],
    media: (media.data ?? []) as MediaRow[],
    batches: (batches.data ?? []) as BatchRow[],
    receipts: (receipts.data ?? []) as ReceiptRow[],
  });
}

export async function loadAuthenticatedAyraState(supabase: AyraSupabaseClient) {
  return loadOperatorAyraStateFromClient(supabase, { fallbackToDemo: false });
}

async function loadOperatorAyraStateFromClient(
  supabase: AyraSupabaseClient,
  { fallbackToDemo }: { fallbackToDemo: boolean },
) {
  const [
    profiles,
    userRoles,
    tracks,
    sponsors,
    initiatives,
    applications,
    stewardProfiles,
    grantees,
    granteeContacts,
    payoutAddresses,
    milestones,
    updates,
    media,
    batches,
    lineItems,
    fundingAllocations,
    reconciliationItems,
    sdpSyncEvents,
    auditLogs,
  ] = await Promise.all([
    supabase.from("profiles").select("id,email,display_name,created_at"),
    supabase.from("user_roles").select("id,profile_id,role,initiative_id,grantee_id"),
    supabase.from("tracks").select("id,slug,name,local_currency,theme"),
    supabase.from("sponsors").select("id,slug,name,public_attribution"),
    supabase
      .from("initiatives")
      .select(
        "id,track_id,sponsor_id,code,slug,name,headline,description,steward_name,league_score,target_metric_label,target_metric_current,target_metric_goal,status",
      ),
    supabase
      .from("applications")
      .select(
        "id,applicant_profile_id,applicant_name,applicant_email,proposed_track_name,proposed_initiative_name,scope_summary,operational_notes,contact_signal,status,submitted_at,decided_at,decided_by_profile_id",
      ),
    supabase
      .from("steward_profiles")
      .select("id,profile_id,initiative_id,organisation_name,public_contact_name,private_phone"),
    supabase
      .from("grantees")
      .select("id,initiative_id,name,contact_profile_id"),
    supabase.from("grantee_contacts").select("id,profile_id,grantee_id"),
    supabase
      .from("payout_addresses")
      .select(
        "id,initiative_id,address,status,submitted_by_profile_id,submitted_at,verified_at,verified_by_profile_id,locked_at,verification_note",
      ),
    supabase.from("milestones").select("id,initiative_id,code,title,percent_complete,status"),
    supabase
      .from("initiative_updates")
      .select(
        "id,initiative_id,milestone_id,submitted_by_profile_id,source,caption,public_caption,status,internal_initials,submitted_at,published_at,moderated_by_profile_id,sanitized_feedback",
      ),
    supabase.from("update_media").select("update_id,kind,url,alt,public_ready"),
    supabase
      .from("funding_batches")
      .select(
        "id,initiative_id,sponsor_id,code,period_label,status,created_by_profile_id,created_at,submitted_at,settled_at,sdp_batch_id",
      ),
    supabase
      .from("batch_line_items")
      .select(
        "id,batch_id,category,amount_usdc,local_amount,local_currency,status,sdp_payment_id,transaction_hash,payment_asset_code,payment_asset_issuer,payment_asset_amount,private_recipient_name",
      ),
    supabase
      .from("funding_allocations")
      .select(
        "id,initiative_id,sponsor_id,batch_id,category,amount_usdc,local_amount,local_currency,status,notes,created_by_profile_id,created_at",
      ),
    supabase
      .from("reconciliation_items")
      .select(
        "id,batch_id,line_item_id,status,private_receipt_path,note,created_by_profile_id,created_at,reconciled_at",
      ),
    supabase
      .from("sdp_sync_events")
      .select("id,batch_id,provider,action,status,external_id,message,created_at"),
    supabase
      .from("audit_logs")
      .select("id,actor_profile_id,action,entity_type,entity_id,before_summary,after_summary,created_at"),
  ]);

  const results = [
    profiles,
    userRoles,
    tracks,
    sponsors,
    initiatives,
    applications,
    stewardProfiles,
    grantees,
    granteeContacts,
    payoutAddresses,
    milestones,
    updates,
    media,
    batches,
    lineItems,
    fundingAllocations,
    reconciliationItems,
    sdpSyncEvents,
    auditLogs,
  ];
  if (results.some((result) => result.error)) {
    console.error("Falling back to AYRA demo state after operator Supabase read failure.");
    if (fallbackToDemo) return createDemoState();
    throw new Error("Authenticated Supabase read failed.");
  }

  return stateFromOperatorRows({
    profiles: (profiles.data ?? []) as ProfileRow[],
    userRoles: (userRoles.data ?? []) as UserRoleRow[],
    tracks: (tracks.data ?? []) as TrackRow[],
    sponsors: (sponsors.data ?? []) as SponsorRow[],
    initiatives: (initiatives.data ?? []) as InitiativeRow[],
    applications: (applications.data ?? []) as ApplicationRow[],
    stewardProfiles: (stewardProfiles.data ?? []) as StewardProfileRow[],
    grantees: (grantees.data ?? []) as GranteeRow[],
    granteeContacts: (granteeContacts.data ?? []) as GranteeContactRow[],
    payoutAddresses: (payoutAddresses.data ?? []) as PayoutAddressRow[],
    milestones: (milestones.data ?? []) as MilestoneRow[],
    updates: (updates.data ?? []) as UpdateRow[],
    media: (media.data ?? []) as MediaRow[],
    batches: (batches.data ?? []) as BatchRow[],
    receipts: [],
    lineItems: (lineItems.data ?? []) as LineItemRow[],
    fundingAllocations: (fundingAllocations.data ?? []) as FundingAllocationRow[],
    reconciliationItems: (reconciliationItems.data ?? []) as ReconciliationRow[],
    sdpSyncEvents: (sdpSyncEvents.data ?? []) as SdpSyncEventRow[],
    auditLogs: (auditLogs.data ?? []) as AuditLogRow[],
  });
}

export function stateFromPublicRows(rows: PublicRows): AyraState {
  const mediaByUpdate = new Map<string, UpdateMedia[]>();
  rows.media.forEach((item) => {
    const current = mediaByUpdate.get(item.update_id) ?? [];
    current.push({
      kind: mediaKind(item.kind),
      url: item.url,
      alt: item.alt,
      publicReady: item.public_ready,
    });
    mediaByUpdate.set(item.update_id, current);
  });

  return {
    profiles: [],
    userRoles: [],
    tracks: rows.tracks.map(mapTrack),
    initiatives: rows.initiatives.map(mapInitiative),
    applications: [],
    stewardProfiles: [],
    grantees: [],
    granteeContacts: [],
    payoutAddresses: [],
    sponsors: rows.sponsors.map(mapSponsor),
    milestones: rows.milestones.map(mapMilestone),
    updates: rows.updates.map((row) => mapUpdate(row, mediaByUpdate)),
    batches: rows.batches.map(mapBatch),
    batchLineItems: rows.receipts.map(mapReceiptLineItem),
    fundingAllocations: [],
    reconciliationItems: [],
    sdpSyncEvents: [],
    auditLogs: [],
  };
}

export function stateFromOperatorRows(rows: OperatorRows): AyraState {
  const state = stateFromPublicRows(rows);
  return {
    ...state,
    profiles: rows.profiles.map(mapProfile),
    userRoles: rows.userRoles.map(mapUserRole),
    applications: rows.applications.map(mapApplication),
    stewardProfiles: rows.stewardProfiles.map(mapStewardProfile),
    grantees: rows.grantees.map(mapGrantee),
    granteeContacts: rows.granteeContacts.map(mapGranteeContact),
    payoutAddresses: rows.payoutAddresses.map(mapPayoutAddress),
    batchLineItems: rows.lineItems?.map(mapLineItem) ?? state.batchLineItems,
    fundingAllocations: rows.fundingAllocations.map(mapFundingAllocation),
    reconciliationItems: rows.reconciliationItems.map(mapReconciliationItem),
    sdpSyncEvents: rows.sdpSyncEvents.map(mapSdpSyncEvent),
    auditLogs: rows.auditLogs.map(mapAuditLog),
  };
}

function mapTrack(row: TrackRow): Track {
  return {
    id: row.id,
    slug: row.slug,
    name: canonicalTrackNames[row.slug] ?? row.name,
    localCurrency: currency(row.local_currency),
    theme: row.theme,
  };
}

function mapSponsor(row: SponsorRow): Sponsor {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    publicAttribution: row.public_attribution ?? "",
  };
}

function mapInitiative(row: InitiativeRow): Initiative {
  return {
    id: row.id,
    trackId: row.track_id,
    sponsorId: row.sponsor_id ?? undefined,
    code: row.code,
    slug: row.slug,
    name: row.name,
    headline: row.headline,
    description: row.description,
    stewardName: row.steward_name ?? undefined,
    leagueScore: numeric(row.league_score),
    targetMetricLabel: row.target_metric_label,
    targetMetricCurrent: numeric(row.target_metric_current),
    targetMetricGoal: numeric(row.target_metric_goal),
    status:
      row.status === "live" || row.status === "draft" ? row.status : "funding",
  };
}

function mapMilestone(row: MilestoneRow): Milestone {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    code: row.code,
    title: row.title,
    percentComplete: numeric(row.percent_complete),
    status:
      row.status === "done" || row.status === "active" ? row.status : "planned",
  };
}

function mapUpdate(
  row: UpdateRow,
  mediaByUpdate: Map<string, UpdateMedia[]>,
): InitiativeUpdate {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    milestoneId: row.milestone_id,
    submittedByProfileId: row.submitted_by_profile_id,
    source: updateSource(row.source),
    caption: row.caption,
    publicCaption: row.public_caption ?? undefined,
    status: updateStatus(row.status),
    media: mediaByUpdate.get(row.id) ?? [],
    internalInitials: row.internal_initials ?? undefined,
    submittedAt: row.submitted_at,
    publishedAt: row.published_at ?? undefined,
    moderatedByProfileId: row.moderated_by_profile_id ?? undefined,
    sanitizedFeedback: row.sanitized_feedback ?? undefined,
  };
}

function mapBatch(row: BatchRow): Batch {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    sponsorId: row.sponsor_id ?? undefined,
    code: row.code,
    periodLabel: row.period_label,
    status: batchStatus(row.status),
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
    submittedAt: row.submitted_at ?? undefined,
    settledAt: row.settled_at ?? undefined,
    sdpBatchId: row.sdp_batch_id ?? undefined,
  };
}

function mapReceiptLineItem(row: ReceiptRow): BatchLineItem {
  return {
    id: row.line_item_id ?? `${row.batch_id}-${slugify(row.category)}`,
    batchId: row.batch_id,
    category: row.category,
    amountUsdc: numeric(row.amount_usdc),
    localAmount: numeric(row.local_amount),
    localCurrency: currency(row.local_currency),
    status: lineItemStatus(row.line_item_status ?? row.batch_status),
    transactionHash: row.transaction_hash ?? undefined,
    paymentAssetCode: row.payment_asset_code === "USDC" ? "USDC" : undefined,
    paymentAssetIssuer: row.payment_asset_issuer ?? undefined,
    paymentAssetAmount:
      row.payment_asset_amount == null ? undefined : numeric(row.payment_asset_amount),
  };
}

function mapLineItem(row: LineItemRow): BatchLineItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    category: row.category,
    amountUsdc: numeric(row.amount_usdc),
    localAmount: numeric(row.local_amount),
    localCurrency: currency(row.local_currency),
    status: lineItemStatus(row.status),
    sdpPaymentId: row.sdp_payment_id ?? undefined,
    transactionHash: row.transaction_hash ?? undefined,
    paymentAssetCode: row.payment_asset_code === "USDC" ? "USDC" : undefined,
    paymentAssetIssuer: row.payment_asset_issuer ?? undefined,
    paymentAssetAmount:
      row.payment_asset_amount == null ? undefined : numeric(row.payment_asset_amount),
    recipientName: row.private_recipient_name ?? undefined,
  };
}

function mapFundingAllocation(row: FundingAllocationRow): FundingAllocation {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    sponsorId: row.sponsor_id ?? undefined,
    batchId: row.batch_id ?? undefined,
    category: row.category,
    amountUsdc: numeric(row.amount_usdc),
    localAmount: numeric(row.local_amount),
    localCurrency: currency(row.local_currency),
    status:
      row.status === "batched" ||
      row.status === "submitted" ||
      row.status === "settled"
        ? row.status
        : "planned",
    notes: row.notes ?? undefined,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
  };
}

function mapReconciliationItem(row: ReconciliationRow): ReconciliationItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    lineItemId: row.line_item_id,
    status:
      row.status === "receipt_attached" || row.status === "reconciled"
        ? row.status
        : "needs_receipt",
    privateReceiptPath: row.private_receipt_path ?? undefined,
    note: row.note ?? undefined,
    createdByProfileId: row.created_by_profile_id,
    createdAt: row.created_at,
    reconciledAt: row.reconciled_at ?? undefined,
  };
}

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

function mapUserRole(row: UserRoleRow): UserRole {
  return {
    id: row.id,
    profileId: row.profile_id,
    role: appRole(row.role),
    initiativeId: row.initiative_id ?? undefined,
    granteeId: row.grantee_id ?? undefined,
  };
}

function mapApplication(row: ApplicationRow): Application {
  return {
    id: row.id,
    applicantProfileId: row.applicant_profile_id ?? "",
    applicantName: row.applicant_name,
    applicantEmail: row.applicant_email,
    proposedTrackName: row.proposed_track_name,
    proposedInitiativeName: row.proposed_initiative_name,
    scopeSummary: row.scope_summary,
    operationalNotes: row.operational_notes,
    contactSignal: row.contact_signal,
    status:
      row.status === "approved" || row.status === "rejected"
        ? row.status
        : "pending",
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at ?? undefined,
    decidedByProfileId: row.decided_by_profile_id ?? undefined,
  };
}

function mapStewardProfile(row: StewardProfileRow): StewardProfile {
  return {
    id: row.id,
    profileId: row.profile_id,
    initiativeId: row.initiative_id,
    organisationName: row.organisation_name,
    publicContactName: row.public_contact_name,
    privatePhone: row.private_phone ?? undefined,
  };
}

function mapGrantee(row: GranteeRow): Grantee {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    name: row.name,
    contactProfileId: row.contact_profile_id ?? undefined,
  };
}

function mapGranteeContact(row: GranteeContactRow): GranteeContact {
  return {
    id: row.id,
    profileId: row.profile_id,
    granteeId: row.grantee_id,
  };
}

function mapPayoutAddress(row: PayoutAddressRow): PayoutAddress {
  return {
    id: row.id,
    initiativeId: row.initiative_id,
    address: row.address,
    status: payoutAddressStatus(row.status),
    submittedByProfileId: row.submitted_by_profile_id,
    submittedAt: row.submitted_at,
    verifiedAt: row.verified_at ?? undefined,
    verifiedByProfileId: row.verified_by_profile_id ?? undefined,
    lockedAt: row.locked_at ?? undefined,
    verificationNote: row.verification_note ?? undefined,
  };
}

function mapSdpSyncEvent(row: SdpSyncEventRow): SdpSyncEvent {
  return {
    id: row.id,
    batchId: row.batch_id,
    provider: row.provider === "stellar-sdp" ? "stellar-sdp" : "mock",
    action:
      row.action === "upload_instructions" ||
      row.action === "mark_ready" ||
      row.action === "sync_status"
        ? row.action
        : "create_batch",
    status: row.status === "error" ? "error" : "ok",
    createdAt: row.created_at,
    externalId: row.external_id ?? undefined,
    message: row.message ?? undefined,
  };
}

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorProfileId: row.actor_profile_id ?? "",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id ?? "",
    before: row.before_summary ?? undefined,
    after: row.after_summary ?? undefined,
    createdAt: row.created_at,
  };
}

function numeric(value: number | string) {
  return typeof value === "number" ? value : Number(value);
}

function currency(value: string): "COP" | "USD" {
  return value === "USD" ? "USD" : "COP";
}

function appRole(value: string): Role {
  if (
    value === "admin" ||
    value === "steward" ||
    value === "grantee_contact" ||
    value === "applicant"
  ) {
    return value;
  }
  return "applicant";
}

function updateStatus(value: string): UpdateStatus {
  if (value === "draft" || value === "approved" || value === "rejected") {
    return value;
  }
  return "pending";
}

function batchStatus(value: string): BatchStatus {
  if (value === "ready" || value === "submitted" || value === "settled") {
    return value;
  }
  return "draft";
}

function lineItemStatus(value: string): BatchLineItem["status"] {
  if (value === "processing" || value === "settled" || value === "submitted") {
    return value;
  }
  return "draft";
}

function payoutAddressStatus(value: string): PayoutAddressStatus {
  if (value === "verified" || value === "locked" || value === "rejected") {
    return value;
  }
  return "pending";
}

function updateSource(value: string): InitiativeUpdate["source"] {
  if (value === "steward" || value === "operator") return value;
  return "grantee_contact";
}

function mediaKind(value: string): UpdateMedia["kind"] {
  return value === "video" ? "video" : "image";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}
