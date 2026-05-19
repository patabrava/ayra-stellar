export type Role = "admin" | "steward" | "grantee_contact" | "applicant";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type UpdateStatus = "draft" | "pending" | "approved" | "rejected";
export type BatchStatus = "draft" | "ready" | "submitted" | "settled";
export type PayoutAddressStatus = "pending" | "verified" | "locked" | "rejected";

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

export type UserRole = {
  id: string;
  profileId: string;
  role: Role;
  initiativeId?: string;
  granteeId?: string;
};

export type Track = {
  id: string;
  slug: string;
  name: string;
  localCurrency: "COP" | "USD";
  theme: string;
};

export type Initiative = {
  id: string;
  trackId: string;
  code: string;
  slug: string;
  name: string;
  headline: string;
  description: string;
  stewardName?: string;
  sponsorId?: string;
  leagueScore: number;
  targetMetricLabel: string;
  targetMetricCurrent: number;
  targetMetricGoal: number;
  status: "live" | "funding" | "draft";
};

export type Application = {
  id: string;
  applicantProfileId: string;
  applicantName: string;
  applicantEmail: string;
  proposedTrackName: string;
  proposedInitiativeName: string;
  scopeSummary: string;
  operationalNotes: string;
  contactSignal: string;
  status: ApplicationStatus;
  submittedAt: string;
  decidedAt?: string;
  decidedByProfileId?: string;
};

export type StewardProfile = {
  id: string;
  profileId: string;
  initiativeId: string;
  organisationName: string;
  publicContactName: string;
  privatePhone?: string;
};

export type Grantee = {
  id: string;
  initiativeId: string;
  name: string;
  contactProfileId?: string;
};

export type GranteeContact = {
  id: string;
  profileId: string;
  granteeId: string;
};

export type PayoutAddress = {
  id: string;
  initiativeId: string;
  address: string;
  status: PayoutAddressStatus;
  submittedByProfileId: string;
  submittedAt: string;
  verifiedAt?: string;
  verifiedByProfileId?: string;
  lockedAt?: string;
  verificationNote?: string;
};

export type Sponsor = {
  id: string;
  slug: string;
  name: string;
  publicAttribution: string;
};

export type Milestone = {
  id: string;
  initiativeId: string;
  code: string;
  title: string;
  percentComplete: number;
  status: "done" | "active" | "planned";
};

export type UpdateMedia = {
  kind: "image" | "video";
  url: string;
  alt: string;
  publicReady: boolean;
};

export type InitiativeUpdate = {
  id: string;
  initiativeId: string;
  milestoneId: string;
  submittedByProfileId: string;
  source: "steward" | "grantee_contact" | "operator";
  caption: string;
  publicCaption?: string;
  status: UpdateStatus;
  media: UpdateMedia[];
  internalInitials?: string;
  submittedAt: string;
  publishedAt?: string;
  moderatedByProfileId?: string;
  sanitizedFeedback?: string;
};

export type Batch = {
  id: string;
  initiativeId: string;
  sponsorId?: string;
  code: string;
  periodLabel: string;
  status: BatchStatus;
  createdByProfileId: string;
  createdAt: string;
  submittedAt?: string;
  settledAt?: string;
  sdpBatchId?: string;
};

export type BatchLineItem = {
  id: string;
  batchId: string;
  category: string;
  amountUsdc: number;
  localAmount: number;
  localCurrency: "COP" | "USD";
  status: "draft" | "submitted" | "processing" | "settled";
  sdpPaymentId?: string;
  transactionHash?: string;
  recipientName?: string;
};

export type FundingAllocation = {
  id: string;
  initiativeId: string;
  sponsorId?: string;
  batchId?: string;
  category: string;
  amountUsdc: number;
  localAmount: number;
  localCurrency: "COP" | "USD";
  status: "planned" | "batched" | "submitted" | "settled";
  notes?: string;
  createdByProfileId: string;
  createdAt: string;
};

export type ReconciliationItem = {
  id: string;
  batchId: string;
  lineItemId: string;
  status: "needs_receipt" | "receipt_attached" | "reconciled";
  privateReceiptPath?: string;
  note?: string;
  createdByProfileId: string;
  createdAt: string;
  reconciledAt?: string;
};

export type SdpSyncEvent = {
  id: string;
  batchId: string;
  provider: "mock" | "stellar-sdp";
  action: "create_batch" | "upload_instructions" | "mark_ready" | "sync_status";
  status: "ok" | "error";
  createdAt: string;
  externalId?: string;
  message?: string;
};

export type AuditLog = {
  id: string;
  actorProfileId: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export type AyraState = {
  profiles: Profile[];
  userRoles: UserRole[];
  tracks: Track[];
  initiatives: Initiative[];
  applications: Application[];
  stewardProfiles: StewardProfile[];
  grantees: Grantee[];
  granteeContacts: GranteeContact[];
  payoutAddresses: PayoutAddress[];
  sponsors: Sponsor[];
  milestones: Milestone[];
  updates: InitiativeUpdate[];
  batches: Batch[];
  batchLineItems: BatchLineItem[];
  fundingAllocations: FundingAllocation[];
  reconciliationItems: ReconciliationItem[];
  sdpSyncEvents: SdpSyncEvent[];
  auditLogs: AuditLog[];
};

export type PublicWallProjection = {
  track: Track;
  initiatives: Initiative[];
  activeInitiative: Initiative;
  milestones: Milestone[];
  updates: Array<{
    id: string;
    initiativeName: string;
    milestoneCode: string;
    caption: string;
    media: UpdateMedia[];
    status: "approved";
    publishedAt: string;
  }>;
  spending: Array<{
    batchCode: string;
    category: string;
    amountUsdc: number;
    localAmount: number;
    localCurrency: string;
    recipientName?: never;
  }>;
  batches: Array<{
    id: string;
    code: string;
    initiativeName: string;
    periodLabel: string;
    amountUsdc: number;
    sponsorName?: string;
    status: BatchStatus;
    publicLabel: "In flight" | "Cleared";
  }>;
};

export type PublicInitiativeProjection = {
  track: Track;
  initiative: Initiative;
  siblingInitiatives: Initiative[];
  milestones: Milestone[];
  updates: Array<{
    id: string;
    initiativeName: string;
    milestoneCode: string;
    caption: string;
    media: UpdateMedia[];
    status: "approved";
    publishedAt: string;
  }>;
  spending: Array<{
    batchCode: string;
    category: string;
    amountUsdc: number;
    localAmount: number;
    localCurrency: string;
    recipientName?: never;
  }>;
  batches: Array<{
    id: string;
    code: string;
    initiativeName: string;
    periodLabel: string;
    amountUsdc: number;
    sponsorName?: string;
    status: BatchStatus;
    publicLabel: "In flight" | "Cleared";
  }>;
};

export type ProofPack = {
  batchId: string;
  batchCode: string;
  initiativeName: string;
  initiativeSlug: string;
  trackSlug: string;
  sponsorName?: string;
  periodLabel: string;
  publicLabel: "In flight" | "Cleared";
  receipts: Array<{
    id: string;
    category: string;
    amountUsdc: number;
    localAmount: number;
    localCurrency: string;
    transactionHash?: string;
    sdpPaymentId?: string;
  }>;
};

export type FundingBatchInput = {
  actorProfileId: string;
  initiativeId: string;
  code: string;
  periodLabel: string;
  sponsorId?: string;
  lineItems: Array<{
    category: string;
    amountUsdc: number;
    localAmount: number;
    localCurrency: "COP" | "USD";
  }>;
};

export type SdpGateway = {
  createBatch: (batch: Batch, lineItems: BatchLineItem[]) => SdpBatchResult;
  syncBatch: (batch: Batch, lineItems: BatchLineItem[]) => Promise<SdpPaymentResult[]>;
};

type SdpBatchResult = {
  externalBatchId: string;
  payments: Array<{ lineItemId: string; paymentId: string }>;
};

type SdpPaymentResult = {
  lineItemId: string;
  status: "settled";
  transactionHash: string;
};

const baseTime = Date.parse("2026-05-15T12:00:00.000Z");

function stamp(offsetMinutes = 0) {
  return new Date(baseTime + offsetMinutes * 60_000).toISOString();
}

function cloneState(state: AyraState): AyraState {
  return {
    profiles: [...state.profiles],
    userRoles: [...state.userRoles],
    tracks: [...state.tracks],
    initiatives: [...state.initiatives],
    applications: [...state.applications],
    stewardProfiles: [...state.stewardProfiles],
    grantees: [...state.grantees],
    granteeContacts: [...state.granteeContacts],
    payoutAddresses: [...state.payoutAddresses],
    sponsors: [...state.sponsors],
    milestones: [...state.milestones],
    updates: [...state.updates],
    batches: [...state.batches],
    batchLineItems: [...state.batchLineItems],
    fundingAllocations: [...state.fundingAllocations],
    reconciliationItems: [...state.reconciliationItems],
    sdpSyncEvents: [...state.sdpSyncEvents],
    auditLogs: [...state.auditLogs],
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

function idFor(prefix: string, value: string) {
  return `${prefix}-${slugify(value)}`;
}

function appendAudit(
  state: AyraState,
  entry: Omit<AuditLog, "id" | "createdAt">,
): AyraState {
  return {
    ...state,
    auditLogs: [
      ...state.auditLogs,
      {
        id: `audit-${state.auditLogs.length + 1}`,
        createdAt: stamp(state.auditLogs.length + 1),
        ...entry,
      },
    ],
  };
}

function requireAdmin(state: AyraState, actorProfileId: string) {
  const isAdmin = state.userRoles.some(
    (role) => role.profileId === actorProfileId && role.role === "admin",
  );
  if (!isAdmin) {
    throw new Error("Admin role required for this mutation.");
  }
}

function requireInitiativeAccess(
  state: AyraState,
  actorProfileId: string,
  initiativeId: string,
) {
  const scopedGranteeIds = new Set(
    state.grantees
      .filter((grantee) => grantee.initiativeId === initiativeId)
      .map((grantee) => grantee.id),
  );
  const hasAccess = state.userRoles.some(
    (role) =>
      role.profileId === actorProfileId &&
      ((role.role === "steward" && role.initiativeId === initiativeId) ||
        (role.role === "grantee_contact" &&
          role.granteeId &&
          scopedGranteeIds.has(role.granteeId))),
  );
  if (!hasAccess) {
    throw new Error("Scoped initiative access required for this mutation.");
  }
}

function requireVerifiedPayoutAddress(state: AyraState, initiativeId: string) {
  const address = state.payoutAddresses.find(
    (item) =>
      item.initiativeId === initiativeId &&
      (item.status === "verified" || item.status === "locked"),
  );
  if (!address) {
    throw new Error("Cannot create batch without a verified payout address.");
  }
  return address;
}

export function createDemoState(): AyraState {
  const profiles: Profile[] = [
    {
      id: "profile-admin",
      email: "caposk817@gmail.com",
      displayName: "Nicolas Alvarez",
      createdAt: "2026-01-02T09:00:00.000Z",
    },
    {
      id: "profile-leidy",
      email: "leidy@ecoparque.co",
      displayName: "Leidy Mendoza",
      createdAt: "2026-01-08T11:00:00.000Z",
    },
    {
      id: "profile-applicant",
      email: "applicant@example.org",
      displayName: "Prospective steward",
      createdAt: "2026-04-30T14:00:00.000Z",
    },
  ];

  const tracks: Track[] = [
    {
      id: "track-providencia",
      slug: "providencia",
      name: "Providencia",
      localCurrency: "COP",
      theme: "Cinematic island stewardship",
    },
    {
      id: "track-amazonas",
      slug: "amazonas",
      name: "Amazonas",
      localCurrency: "COP",
      theme: "Synthetic forest corridor demo",
    },
  ];

  const sponsors: Sponsor[] = [
    {
      id: "sponsor-audi",
      slug: "audi-foundation",
      name: "Audi Foundation",
      publicAttribution: "With support from Audi Foundation.",
    },
    {
      id: "sponsor-climate-future",
      slug: "climate-future",
      name: "Climate Future",
      publicAttribution: "Climate Future matched this month.",
    },
  ];

  const initiatives: Initiative[] = [
    {
      id: "initiative-reforest",
      trackId: "track-providencia",
      code: "AYRA-PVD-REFOREST",
      slug: "reforestation",
      name: "Reforestation",
      headline: "Native canopy across Old Point and Bottom House.",
      description:
        "Local crews are rebuilding native canopy cover with monthly field updates and category-level on-chain receipts.",
      stewardName: "Leidy Mendoza",
      sponsorId: "sponsor-climate-future",
      leagueScore: 87,
      targetMetricLabel: "Trees in the ground",
      targetMetricCurrent: 1284,
      targetMetricGoal: 1800,
      status: "live",
    },
    {
      id: "initiative-sterilization",
      trackId: "track-providencia",
      code: "AYRA-PVD-STERIL",
      slug: "dog-sterilization",
      name: "Dog Sterilization",
      headline: "A mobile clinic for the island.",
      description:
        "A six-month veterinary lane waiting on final payout verification before the first batch.",
      stewardName: "Dr. M. Gomez",
      sponsorId: "sponsor-audi",
      leagueScore: 71,
      targetMetricLabel: "Clinic slots",
      targetMetricCurrent: 0,
      targetMetricGoal: 420,
      status: "funding",
    },
    {
      id: "initiative-reef",
      trackId: "track-providencia",
      code: "AYRA-PVD-REEF",
      slug: "reef",
      name: "Reef",
      headline: "East-shore reef monitoring.",
      description:
        "A planning-stage reef restoration lane for later Providencia transparency releases.",
      leagueScore: 58,
      targetMetricLabel: "Survey sites",
      targetMetricCurrent: 0,
      targetMetricGoal: 8,
      status: "funding",
    },
    {
      id: "initiative-amazonas-corridor",
      trackId: "track-amazonas",
      code: "AYRA-AMZ-CORRIDOR",
      slug: "forest-corridor-demo",
      name: "Forest Corridor Demo",
      headline: "Synthetic canopy monitoring lane for cross-track proof.",
      description:
        "A seeded synthetic corridor initiative used only to prove public track scoping.",
      stewardName: "Maya Rojas",
      leagueScore: 64,
      targetMetricLabel: "Survey plots",
      targetMetricCurrent: 12,
      targetMetricGoal: 30,
      status: "live",
    },
  ];

  const milestones: Milestone[] = [
    {
      id: "milestone-reforest-01",
      initiativeId: "initiative-reforest",
      code: "M01",
      title: "Permits and sites locked",
      percentComplete: 100,
      status: "done",
    },
    {
      id: "milestone-reforest-02",
      initiativeId: "initiative-reforest",
      code: "M02",
      title: "Nursery ready",
      percentComplete: 100,
      status: "done",
    },
    {
      id: "milestone-reforest-03",
      initiativeId: "initiative-reforest",
      code: "M03",
      title: "Planting in flight",
      percentComplete: 71,
      status: "active",
    },
    {
      id: "milestone-reforest-04",
      initiativeId: "initiative-reforest",
      code: "M04",
      title: "Q4 survival audit",
      percentComplete: 0,
      status: "planned",
    },
    {
      id: "milestone-amazonas-01",
      initiativeId: "initiative-amazonas-corridor",
      code: "A01",
      title: "Synthetic corridor baseline",
      percentComplete: 40,
      status: "active",
    },
  ];

  const batches: Batch[] = [
    {
      id: "batch-reforest-apr26",
      initiativeId: "initiative-reforest",
      sponsorId: "sponsor-climate-future",
      code: "PV-REFOREST-APR26",
      periodLabel: "April 2026",
      status: "submitted",
      createdByProfileId: "profile-admin",
      createdAt: "2026-04-29T10:00:00.000Z",
      submittedAt: "2026-04-30T09:14:00.000Z",
      sdpBatchId: "mock-batch-reforest-apr26",
    },
    {
      id: "batch-reforest-mar26",
      initiativeId: "initiative-reforest",
      sponsorId: "sponsor-audi",
      code: "PV-REFOREST-MAR26",
      periodLabel: "March 2026",
      status: "settled",
      createdByProfileId: "profile-admin",
      createdAt: "2026-03-28T10:00:00.000Z",
      submittedAt: "2026-03-31T09:02:00.000Z",
      settledAt: "2026-03-31T12:15:00.000Z",
      sdpBatchId: "mock-batch-reforest-mar26",
    },
    {
      id: "batch-reforest-feb26",
      initiativeId: "initiative-reforest",
      code: "PV-REFOREST-FEB26",
      periodLabel: "February 2026",
      status: "settled",
      createdByProfileId: "profile-admin",
      createdAt: "2026-02-27T10:00:00.000Z",
      submittedAt: "2026-02-28T10:18:00.000Z",
      settledAt: "2026-02-28T15:00:00.000Z",
      sdpBatchId: "mock-batch-reforest-feb26",
    },
    {
      id: "batch-amazonas-apr26",
      initiativeId: "initiative-amazonas-corridor",
      code: "AMZ-CORRIDOR-APR26",
      periodLabel: "April 2026",
      status: "submitted",
      createdByProfileId: "profile-admin",
      createdAt: "2026-04-26T10:00:00.000Z",
      submittedAt: "2026-04-27T10:00:00.000Z",
      sdpBatchId: "mock-batch-amazonas-apr26",
    },
  ];

  return {
    profiles,
    userRoles: [
      { id: "role-admin", profileId: "profile-admin", role: "admin" },
      {
        id: "role-leidy-steward",
        profileId: "profile-leidy",
        role: "steward",
        initiativeId: "initiative-reforest",
      },
      {
        id: "role-leidy-contact",
        profileId: "profile-leidy",
        role: "grantee_contact",
        granteeId: "grantee-leidy",
      },
    ],
    tracks,
    initiatives,
    applications: [
      {
        id: "application-sterilization",
        applicantProfileId: "profile-applicant",
        applicantName: "Dr. M. Gomez",
        applicantEmail: "gomez@vetprov.co",
        proposedTrackName: "Providencia",
        proposedInitiativeName: "Dog Sterilization",
        scopeSummary: "Mobile clinic support for six months.",
        operationalNotes: "Needs payout verification before funding.",
        contactSignal: "+57 300 222 1111",
        status: "pending",
        submittedAt: "2026-05-01T11:15:00.000Z",
      },
    ],
    stewardProfiles: [
      {
        id: "steward-leidy",
        profileId: "profile-leidy",
        initiativeId: "initiative-reforest",
        organisationName: "Ecoparque Iron Wood",
        publicContactName: "Leidy Mendoza",
        privatePhone: "+57 300 000 0000",
      },
    ],
    grantees: [
      {
        id: "grantee-leidy",
        initiativeId: "initiative-reforest",
        name: "Ecoparque Iron Wood",
        contactProfileId: "profile-leidy",
      },
    ],
    granteeContacts: [
      {
        id: "contact-leidy",
        profileId: "profile-leidy",
        granteeId: "grantee-leidy",
      },
    ],
    payoutAddresses: [
      {
        id: "payout-reforest",
        initiativeId: "initiative-reforest",
        address: "GBLEIDYECOPARQUEIRONWOODPROVIDENCIASTELLAR3RS9KQ4MWL2VTYGB7",
        status: "locked",
        submittedByProfileId: "profile-leidy",
        submittedAt: "2026-02-12T10:00:00.000Z",
        verifiedAt: "2026-02-13T13:00:00.000Z",
        verifiedByProfileId: "profile-admin",
        lockedAt: "2026-02-28T15:00:00.000Z",
        verificationNote: "Voice-confirmed on Signal.",
      },
      {
        id: "payout-sterilization",
        initiativeId: "initiative-sterilization",
        address: "GBVETPROVIDENCIASTERILIZATIONSTELLAR7K9F000000000000",
        status: "pending",
        submittedByProfileId: "profile-applicant",
        submittedAt: "2026-04-30T18:42:00.000Z",
      },
    ],
    sponsors,
    milestones,
    updates: [
      {
        id: "update-apr-22",
        initiativeId: "initiative-reforest",
        milestoneId: "milestone-reforest-03",
        submittedByProfileId: "profile-leidy",
        source: "grantee_contact",
        caption:
          "Survival rate by site holding above 85% on the older stands. Casabaja batch transplanted on Thursday.",
        publicCaption:
          "Survival rate by site is holding above 85% on the older stands. Casabaja batch was transplanted on Thursday.",
        status: "approved",
        media: [
          {
            kind: "image",
            url: "/window.svg",
            alt: "Field team checking young native trees.",
            publicReady: true,
          },
        ],
        submittedAt: "2026-04-22T10:06:00.000Z",
        publishedAt: "2026-04-22T15:00:00.000Z",
        moderatedByProfileId: "profile-admin",
      },
      {
        id: "update-apr-28",
        initiativeId: "initiative-reforest",
        milestoneId: "milestone-reforest-03",
        submittedByProfileId: "profile-admin",
        source: "operator",
        caption:
          "Casabaja and Bottom House are now permitted through Q4. Planting line moves south next week.",
        publicCaption:
          "Casabaja and Bottom House are now permitted through Q4. The planting line moves south next week.",
        status: "approved",
        media: [
          {
            kind: "image",
            url: "/globe.svg",
            alt: "Map marker for planting areas.",
            publicReady: true,
          },
        ],
        submittedAt: "2026-04-28T09:00:00.000Z",
        publishedAt: "2026-04-28T13:30:00.000Z",
        moderatedByProfileId: "profile-admin",
      },
      {
        id: "update-may-02-pending",
        initiativeId: "initiative-reforest",
        milestoneId: "milestone-reforest-03",
        submittedByProfileId: "profile-leidy",
        source: "grantee_contact",
        caption:
          "Six volunteers, three rows. Bottom House next week. Nino from Ecoparque cooked the lunch.",
        status: "pending",
        media: [
          {
            kind: "image",
            url: "/file.svg",
            alt: "Pending planting media.",
            publicReady: true,
          },
        ],
        submittedAt: "2026-05-02T14:08:00.000Z",
      },
      {
        id: "update-apr-08-rejected",
        initiativeId: "initiative-reforest",
        milestoneId: "milestone-reforest-02",
        submittedByProfileId: "profile-leidy",
        source: "steward",
        caption: "Nursery tools and survey kits arrived. Receipts in frame.",
        status: "rejected",
        media: [],
        submittedAt: "2026-04-08T11:02:00.000Z",
        sanitizedFeedback:
          "Receipts contain supplier information. Resubmit the photo without private documents in frame.",
      },
      {
        id: "update-amazonas-apr-18",
        initiativeId: "initiative-amazonas-corridor",
        milestoneId: "milestone-amazonas-01",
        submittedByProfileId: "profile-admin",
        source: "operator",
        caption:
          "Synthetic field crew logged the first corridor plots for cross-track transparency testing.",
        publicCaption:
          "First corridor plots are logged for the synthetic Amazonas transparency lane.",
        status: "approved",
        media: [
          {
            kind: "image",
            url: "/globe.svg",
            alt: "Synthetic corridor map marker.",
            publicReady: true,
          },
        ],
        submittedAt: "2026-04-18T09:00:00.000Z",
        publishedAt: "2026-04-18T12:00:00.000Z",
        moderatedByProfileId: "profile-admin",
      },
    ],
    batches,
    batchLineItems: [
      ...makeLineItems("batch-reforest-apr26", [
        ["Crew wages", 4820, 18_798_000, "settled", "mock-tx-apr-crew"],
        ["Seedlings", 3160, 12_324_000, "settled", "mock-tx-apr-seedlings"],
        ["Tools and transport", 2540, 9_906_000, "processing"],
        ["Training", 1860, 7_254_000, "submitted"],
        ["Monitoring", 1820, 7_098_000, "submitted"],
      ]),
      ...makeLineItems("batch-reforest-mar26", [
        ["Crew wages", 4200, 16_380_000, "settled", "mock-tx-mar-crew"],
        ["Seedlings", 3100, 12_090_000, "settled", "mock-tx-mar-seedlings"],
        ["Tools and transport", 2500, 9_750_000, "settled", "mock-tx-mar-tools"],
        ["Training", 1800, 7_020_000, "settled", "mock-tx-mar-training"],
        ["Monitoring", 4600, 17_940_000, "settled", "mock-tx-mar-monitoring"],
      ]),
      ...makeLineItems("batch-reforest-feb26", [
        ["Permits", 1800, 7_020_000, "settled", "mock-tx-feb-permits"],
        ["Nursery setup", 4200, 16_380_000, "settled", "mock-tx-feb-nursery"],
        ["Tools", 2700, 10_530_000, "settled", "mock-tx-feb-tools"],
        ["Crew wages", 5100, 19_890_000, "settled", "mock-tx-feb-crew"],
      ]),
      ...makeLineItems("batch-amazonas-apr26", [
        ["Synthetic monitoring", 900, 3_510_000, "submitted"],
      ]),
    ],
    fundingAllocations: [
      {
        id: "allocation-reforest-apr26-crew",
        initiativeId: "initiative-reforest",
        sponsorId: "sponsor-audi",
        batchId: "batch-reforest-apr26",
        category: "Crew wages",
        amountUsdc: 4820,
        localAmount: 18_798_000,
        localCurrency: "COP",
        status: "settled",
        notes: "Seeded category allocation.",
        createdByProfileId: "profile-admin",
        createdAt: "2026-04-28T08:00:00.000Z",
      },
    ],
    reconciliationItems: [
      {
        id: "reconciliation-reforest-apr26-crew",
        batchId: "batch-reforest-apr26",
        lineItemId: "batch-reforest-apr26-line-1",
        status: "reconciled",
        privateReceiptPath: "receipts/batch-reforest-apr26/crew.pdf",
        note: "Seeded private receipt pointer.",
        createdByProfileId: "profile-admin",
        createdAt: "2026-04-30T09:30:00.000Z",
        reconciledAt: "2026-04-30T10:00:00.000Z",
      },
    ],
    sdpSyncEvents: [
      {
        id: "sdp-apr-submit",
        batchId: "batch-reforest-apr26",
        provider: "mock",
        action: "mark_ready",
        status: "ok",
        createdAt: "2026-04-30T09:14:00.000Z",
        externalId: "mock-batch-reforest-apr26",
      },
    ],
    auditLogs: [
      {
        id: "audit-seed-1",
        actorProfileId: "profile-admin",
        action: "seed.created",
        entityType: "track",
        entityId: "track-providencia",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

function makeLineItems(
  batchId: string,
  rows: Array<[string, number, number, BatchLineItem["status"], string?]>,
): BatchLineItem[] {
  return rows.map(([category, amountUsdc, localAmount, status, transactionHash], index) => ({
    id: `${batchId}-line-${index + 1}`,
    batchId,
    category,
    amountUsdc,
    localAmount,
    localCurrency: "COP",
    status,
    sdpPaymentId:
      status === "draft" ? undefined : `mock-payment-${batchId}-${index + 1}`,
    transactionHash,
  }));
}

export function submitApplication(
  state: AyraState,
  input: Omit<
    Application,
    "id" | "applicantProfileId" | "status" | "submittedAt"
  >,
) {
  const next = cloneState(state);
  const profileId = idFor("profile", input.applicantEmail);
  const profile: Profile = {
    id: profileId,
    email: input.applicantEmail,
    displayName: input.applicantName,
    createdAt: stamp(next.profiles.length),
  };
  const application: Application = {
    id: idFor("application", `${input.applicantEmail}-${input.proposedInitiativeName}`),
    applicantProfileId: profile.id,
    ...input,
    status: "pending",
    submittedAt: stamp(next.applications.length),
  };

  next.profiles.push(profile);
  next.userRoles.push({
    id: idFor("role", `${profile.id}-applicant`),
    profileId: profile.id,
    role: "applicant",
  });
  next.applications.push(application);

  return {
    state: appendAudit(next, {
      actorProfileId: profile.id,
      action: "application.submitted",
      entityType: "application",
      entityId: application.id,
      after: { status: application.status },
    }),
    application,
  };
}

export function approveApplication(
  state: AyraState,
  input: {
    applicationId: string;
    actorProfileId: string;
    assignRoles: Array<"steward" | "grantee_contact">;
    initiativeCode: string;
    granteeName: string;
    payoutAddress: string;
  },
) {
  requireAdmin(state, input.actorProfileId);
  const next = cloneState(state);
  const application = next.applications.find(
    (item) => item.id === input.applicationId,
  );
  if (!application) throw new Error("Application not found.");
  if (application.status !== "pending") {
    throw new Error("Only pending applications can be approved.");
  }

  application.status = "approved";
  application.decidedAt = stamp(next.auditLogs.length);
  application.decidedByProfileId = input.actorProfileId;

  const track =
    next.tracks.find(
      (item) =>
        item.name.toLowerCase() === application.proposedTrackName.toLowerCase(),
    ) ?? next.tracks[0];
  const initiative: Initiative = {
    id: idFor("initiative", input.initiativeCode),
    trackId: track.id,
    code: input.initiativeCode,
    slug: slugify(application.proposedInitiativeName),
    name: application.proposedInitiativeName,
    headline: application.scopeSummary,
    description: application.operationalNotes,
    stewardName: application.applicantName,
    leagueScore: 50,
    targetMetricLabel: "Milestone progress",
    targetMetricCurrent: 0,
    targetMetricGoal: 100,
    status: "funding",
  };
  next.initiatives.push(initiative);

  const profile = next.profiles.find(
    (item) => item.id === application.applicantProfileId,
  );
  if (!profile) throw new Error("Applicant profile not found.");

  const grantee: Grantee = {
    id: idFor("grantee", input.granteeName),
    initiativeId: initiative.id,
    name: input.granteeName,
    contactProfileId: profile.id,
  };
  next.grantees.push(grantee);

  const stewardProfile: StewardProfile = {
    id: idFor("steward", profile.id),
    profileId: profile.id,
    initiativeId: initiative.id,
    organisationName: input.granteeName,
    publicContactName: application.applicantName,
    privatePhone: application.contactSignal,
  };
  next.stewardProfiles.push(stewardProfile);

  const granteeContact: GranteeContact = {
    id: idFor("contact", `${profile.id}-${grantee.id}`),
    profileId: profile.id,
    granteeId: grantee.id,
  };
  next.granteeContacts.push(granteeContact);

  next.userRoles = next.userRoles.filter(
    (role) => !(role.profileId === profile.id && role.role === "applicant"),
  );
  input.assignRoles.forEach((role) => {
    next.userRoles.push({
      id: idFor("role", `${profile.id}-${role}`),
      profileId: profile.id,
      role,
      initiativeId: role === "steward" ? initiative.id : undefined,
      granteeId: role === "grantee_contact" ? grantee.id : undefined,
    });
  });

  const payoutAddress: PayoutAddress = {
    id: idFor("payout", initiative.code),
    initiativeId: initiative.id,
    address: input.payoutAddress,
    status: "pending",
    submittedByProfileId: profile.id,
    submittedAt: stamp(next.payoutAddresses.length),
  };
  next.payoutAddresses.push(payoutAddress);

  const milestones: Milestone[] = [
    {
      id: idFor("milestone", `${initiative.code}-m01`),
      initiativeId: initiative.id,
      code: "M01",
      title: "Setup and address verification",
      percentComplete: 0,
      status: "active",
    },
  ];
  next.milestones.push(...milestones);

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "application.approved",
      entityType: "application",
      entityId: application.id,
      before: { status: "pending" },
      after: {
        status: "approved",
        roles: input.assignRoles,
        initiativeId: initiative.id,
      },
    }),
    application,
    initiative,
    profile,
    stewardProfile,
    grantee,
    granteeContact,
    payoutAddress,
    milestones,
  };
}

export function submitPayoutAddress(
  state: AyraState,
  input: {
    actorProfileId: string;
    initiativeId: string;
    address: string;
  },
) {
  requireInitiativeAccess(state, input.actorProfileId, input.initiativeId);
  const next = cloneState(state);
  next.payoutAddresses = next.payoutAddresses.map((item) =>
    item.initiativeId === input.initiativeId && item.status !== "rejected"
      ? { ...item, status: "rejected" }
      : item,
  );

  const payoutAddress: PayoutAddress = {
    id: idFor("payout", `${input.initiativeId}-${next.payoutAddresses.length + 1}`),
    initiativeId: input.initiativeId,
    address: input.address,
    status: "pending",
    submittedByProfileId: input.actorProfileId,
    submittedAt: stamp(next.payoutAddresses.length),
  };
  next.payoutAddresses.push(payoutAddress);

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "payout_address.submitted",
      entityType: "payout_address",
      entityId: payoutAddress.id,
      after: { status: payoutAddress.status },
    }),
    payoutAddress,
  };
}

export function verifyPayoutAddress(
  state: AyraState,
  input: {
    actorProfileId: string;
    payoutAddressId: string;
    verificationNote: string;
  },
) {
  requireAdmin(state, input.actorProfileId);
  const next = cloneState(state);
  const payoutAddress = next.payoutAddresses.find(
    (item) => item.id === input.payoutAddressId,
  );
  if (!payoutAddress) throw new Error("Payout address not found.");
  const before = { status: payoutAddress.status };
  next.payoutAddresses.forEach((item) => {
    if (
      item.initiativeId === payoutAddress.initiativeId &&
      item.id !== payoutAddress.id &&
      item.status !== "rejected"
    ) {
      item.status = "rejected";
    }
  });
  payoutAddress.status = "verified";
  payoutAddress.verifiedAt = stamp(next.auditLogs.length);
  payoutAddress.verifiedByProfileId = input.actorProfileId;
  payoutAddress.verificationNote = input.verificationNote;

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "payout_address.verified",
      entityType: "payout_address",
      entityId: payoutAddress.id,
      before,
      after: { status: payoutAddress.status },
    }),
    payoutAddress,
  };
}

export function submitUpdate(
  state: AyraState,
  input: {
    actorProfileId: string;
    initiativeId: string;
    milestoneId: string;
    caption: string;
    media: UpdateMedia[];
  },
) {
  const canSubmit = state.userRoles.some(
    (role) =>
      role.profileId === input.actorProfileId &&
      (role.role === "steward" || role.role === "grantee_contact"),
  );
  if (!canSubmit) throw new Error("Steward or grantee contact role required.");

  const next = cloneState(state);
  const role = state.userRoles.find(
    (item) =>
      item.profileId === input.actorProfileId &&
      (item.role === "steward" || item.role === "grantee_contact"),
  );
  const update: InitiativeUpdate = {
    id: `update-${next.updates.length + 1}`,
    initiativeId: input.initiativeId,
    milestoneId: input.milestoneId,
    submittedByProfileId: input.actorProfileId,
    source: role?.role === "steward" ? "steward" : "grantee_contact",
    caption: input.caption,
    status: "pending",
    media: input.media,
    submittedAt: stamp(next.updates.length),
  };
  next.updates.push(update);

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "update.submitted",
      entityType: "initiative_update",
      entityId: update.id,
      after: { status: update.status },
    }),
    update,
  };
}

export function moderateUpdate(
  state: AyraState,
  input: {
    actorProfileId: string;
    updateId: string;
    action: "approve" | "edit-and-approve" | "reject" | "save draft";
    publicCaption?: string;
    sanitizedFeedback?: string;
  },
) {
  requireAdmin(state, input.actorProfileId);
  const next = cloneState(state);
  const update = next.updates.find((item) => item.id === input.updateId);
  if (!update) throw new Error("Update not found.");
  const before = { status: update.status };

  if (input.action === "reject") {
    update.status = "rejected";
    update.sanitizedFeedback = input.sanitizedFeedback ?? "Rejected by operator.";
  } else if (input.action === "save draft") {
    update.status = "draft";
  } else {
    update.status = "approved";
    update.publicCaption = input.publicCaption ?? update.caption;
    update.publishedAt = stamp(next.auditLogs.length);
    update.moderatedByProfileId = input.actorProfileId;
  }

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: `update.${input.action.replaceAll(" ", "_")}`,
      entityType: "initiative_update",
      entityId: update.id,
      before,
      after: { status: update.status },
    }),
    update,
  };
}

export function createFundingBatch(state: AyraState, input: FundingBatchInput) {
  requireAdmin(state, input.actorProfileId);
  requireVerifiedPayoutAddress(state, input.initiativeId);
  const next = cloneState(state);
  const batch: Batch = {
    id: idFor("batch", input.code),
    initiativeId: input.initiativeId,
    sponsorId: input.sponsorId,
    code: input.code,
    periodLabel: input.periodLabel,
    status: "ready",
    createdByProfileId: input.actorProfileId,
    createdAt: stamp(next.batches.length),
  };
  const lineItems = input.lineItems.map((item, index): BatchLineItem => ({
    id: `${batch.id}-line-${index + 1}`,
    batchId: batch.id,
    category: item.category,
    amountUsdc: item.amountUsdc,
    localAmount: item.localAmount,
    localCurrency: item.localCurrency,
    status: "draft",
  }));

  next.batches.push(batch);
  next.batchLineItems.push(...lineItems);

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "batch.created",
      entityType: "batch",
      entityId: batch.id,
      after: { status: batch.status, lineItems: lineItems.length },
    }),
    batch,
    lineItems,
  };
}

export function updateBatchLineItems(
  state: AyraState,
  input: {
    actorProfileId: string;
    batchId: string;
    lineItems: FundingBatchInput["lineItems"];
  },
) {
  requireAdmin(state, input.actorProfileId);
  const batch = state.batches.find((item) => item.id === input.batchId);
  if (!batch) throw new Error("Batch not found.");
  if (batch.status === "submitted" || batch.status === "settled") {
    throw new Error("Submitted batch line items are immutable.");
  }
  const next = cloneState(state);
  next.batchLineItems = next.batchLineItems.filter(
    (item) => item.batchId !== input.batchId,
  );
  next.batchLineItems.push(
    ...input.lineItems.map((item, index): BatchLineItem => ({
      id: `${input.batchId}-line-${index + 1}`,
      batchId: input.batchId,
      category: item.category,
      amountUsdc: item.amountUsdc,
      localAmount: item.localAmount,
      localCurrency: item.localCurrency,
      status: "draft",
    })),
  );
  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "batch.line_items_updated",
      entityType: "batch",
      entityId: input.batchId,
    }),
  };
}

export function submitBatchToSdp(
  state: AyraState,
  input: {
    actorProfileId: string;
    batchId: string;
    gateway: SdpGateway;
  },
) {
  requireAdmin(state, input.actorProfileId);
  const next = cloneState(state);
  const batch = next.batches.find((item) => item.id === input.batchId);
  if (!batch) throw new Error("Batch not found.");
  if (batch.status !== "ready") {
    throw new Error("Only ready batches can be submitted to SDP.");
  }
  requireVerifiedPayoutAddress(next, batch.initiativeId);

  const lineItems = next.batchLineItems.filter(
    (item) => item.batchId === batch.id,
  );
  const result = input.gateway.createBatch(batch, lineItems);

  batch.status = "submitted";
  batch.submittedAt = stamp(next.auditLogs.length);
  batch.sdpBatchId = result.externalBatchId;
  lineItems.forEach((lineItem) => {
    const payment = result.payments.find((item) => item.lineItemId === lineItem.id);
    lineItem.status = "submitted";
    lineItem.sdpPaymentId = payment?.paymentId;
  });
  next.sdpSyncEvents.push({
    id: `sdp-${next.sdpSyncEvents.length + 1}`,
    batchId: batch.id,
    provider: "mock",
    action: "create_batch",
    status: "ok",
    createdAt: stamp(next.sdpSyncEvents.length),
    externalId: result.externalBatchId,
  });

  return {
    state: appendAudit(next, {
      actorProfileId: input.actorProfileId,
      action: "batch.submitted",
      entityType: "batch",
      entityId: batch.id,
      after: { status: batch.status, sdpBatchId: batch.sdpBatchId },
    }),
    batch,
  };
}

export async function settleBatchFromSdp(
  state: AyraState,
  input: {
    actorProfileId: string;
    batchId: string;
    gateway: SdpGateway;
  },
) {
  requireAdmin(state, input.actorProfileId);
  const next = cloneState(state);
  const batch = next.batches.find((item) => item.id === input.batchId);
  if (!batch) throw new Error("Batch not found.");
  if (batch.status !== "submitted") {
    throw new Error("Only submitted batches can be synced as settled.");
  }
  const lineItems = next.batchLineItems.filter(
    (item) => item.batchId === batch.id,
  );
  const payments = await input.gateway.syncBatch(batch, lineItems);

  payments.forEach((payment) => {
    const lineItem = lineItems.find((item) => item.id === payment.lineItemId);
    if (lineItem) {
      lineItem.status = "settled";
      lineItem.transactionHash = payment.transactionHash;
    }
  });
  batch.status = "settled";
  batch.settledAt = stamp(next.auditLogs.length);
  next.sdpSyncEvents.push({
    id: `sdp-${next.sdpSyncEvents.length + 1}`,
    batchId: batch.id,
    provider: "mock",
    action: "sync_status",
    status: "ok",
    createdAt: stamp(next.sdpSyncEvents.length),
    externalId: batch.sdpBatchId,
  });

  return appendAudit(next, {
    actorProfileId: input.actorProfileId,
    action: "batch.settled",
    entityType: "batch",
    entityId: batch.id,
    after: { status: batch.status },
  });
}

export const mockSdpGateway: SdpGateway = {
  createBatch(batch, lineItems) {
    return {
      externalBatchId: `mock-sdp-${batch.code.toLowerCase()}`,
      payments: lineItems.map((lineItem, index) => ({
        lineItemId: lineItem.id,
        paymentId: `mock-payment-${batch.code.toLowerCase()}-${index + 1}`,
      })),
    };
  },
  async syncBatch(batch, lineItems) {
    return lineItems.map((lineItem, index) => ({
      lineItemId: lineItem.id,
      status: "settled",
      transactionHash: `mock-tx-${batch.code.toLowerCase()}-${index + 1}`,
    }));
  },
};

export function getPublicWallProjection(
  state: AyraState,
  trackSlug: string,
): PublicWallProjection {
  const track =
    state.tracks.find((item) => item.slug === trackSlug) ?? state.tracks[0];
  if (!track) throw new Error("Track not found.");
  const initiatives = state.initiatives.filter(
    (initiative) => initiative.trackId === track.id,
  );
  const activeInitiative =
    initiatives.find((initiative) => initiative.slug === "reforestation") ??
    initiatives[0];
  if (!activeInitiative) throw new Error("Initiative not found.");
  const initiativeIds = new Set(initiatives.map((initiative) => initiative.id));

  const batches = state.batches
    .filter(
      (batch) =>
        initiativeIds.has(batch.initiativeId) &&
        (batch.status === "submitted" || batch.status === "settled"),
    )
    .map((batch) => ({
      id: batch.id,
      code: batch.code,
      initiativeName:
        initiatives.find((initiative) => initiative.id === batch.initiativeId)
          ?.name ?? "Unknown initiative",
      periodLabel: batch.periodLabel,
      amountUsdc: sumLineItems(state, batch.id),
      sponsorName: state.sponsors.find((sponsor) => sponsor.id === batch.sponsorId)
        ?.name,
      status: batch.status,
      publicLabel:
        batch.status === "settled"
          ? ("Cleared" as const)
          : ("In flight" as const),
    }));

  return {
    track,
    initiatives,
    activeInitiative,
    milestones: state.milestones.filter(
      (milestone) => milestone.initiativeId === activeInitiative.id,
    ),
    updates: state.updates
      .filter(
        (update) =>
          initiativeIds.has(update.initiativeId) &&
          update.status === "approved" &&
          update.publishedAt,
      )
      .sort((a, b) => Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!))
      .map((update) => ({
        id: update.id,
        initiativeName:
          initiatives.find((initiative) => initiative.id === update.initiativeId)
            ?.name ?? "Unknown initiative",
        milestoneCode:
          state.milestones.find((milestone) => milestone.id === update.milestoneId)
            ?.code ?? "",
        caption: update.publicCaption ?? update.caption,
        media: update.media.filter((media) => media.publicReady),
        status: "approved",
        publishedAt: update.publishedAt!,
      })),
    spending: state.batchLineItems
      .filter((lineItem) =>
        state.batches.some(
          (batch) =>
            batch.id === lineItem.batchId &&
            initiativeIds.has(batch.initiativeId) &&
            (batch.status === "submitted" || batch.status === "settled"),
        ),
      )
      .map((lineItem) => ({
        batchCode:
          state.batches.find((batch) => batch.id === lineItem.batchId)?.code ?? "",
        category: lineItem.category,
        amountUsdc: lineItem.amountUsdc,
        localAmount: lineItem.localAmount,
        localCurrency: lineItem.localCurrency,
      })),
    batches,
  };
}

export function getProofPack(state: AyraState, batchId: string): ProofPack {
  const batch = state.batches.find((item) => item.id === batchId);
  if (!batch) throw new Error("Batch not found.");
  if (batch.status !== "submitted" && batch.status !== "settled") {
    throw new Error("Only submitted or settled batches have public proof packs.");
  }
  const initiative = state.initiatives.find(
    (item) => item.id === batch.initiativeId,
  );
  if (!initiative) throw new Error("Initiative not found.");

  return {
    batchId: batch.id,
    batchCode: batch.code,
    initiativeName: initiative.name,
    initiativeSlug: initiative.slug,
    trackSlug:
      state.tracks.find((item) => item.id === initiative.trackId)?.slug ?? "providencia",
    sponsorName: state.sponsors.find((item) => item.id === batch.sponsorId)?.name,
    periodLabel: batch.periodLabel,
    publicLabel: batch.status === "settled" ? "Cleared" : "In flight",
    receipts: state.batchLineItems
      .filter((lineItem) => lineItem.batchId === batch.id)
      .map((lineItem) => ({
        id: lineItem.id,
        category: lineItem.category,
        amountUsdc: lineItem.amountUsdc,
        localAmount: lineItem.localAmount,
        localCurrency: lineItem.localCurrency,
        transactionHash: lineItem.transactionHash,
        sdpPaymentId: lineItem.sdpPaymentId,
      })),
  };
}

export function getPublicInitiativeProjection(
  state: AyraState,
  trackSlug: string,
  initiativeSlug: string,
): PublicInitiativeProjection {
  const wall = getPublicWallProjection(state, trackSlug);
  const initiative =
    wall.initiatives.find((item) => item.slug === initiativeSlug) ?? wall.activeInitiative;

  return {
    track: wall.track,
    initiative,
    siblingInitiatives: wall.initiatives,
    milestones: state.milestones.filter((milestone) => milestone.initiativeId === initiative.id),
    updates: wall.updates.filter((update) => update.initiativeName === initiative.name),
    spending: wall.spending.filter((item) =>
      wall.batches.some(
        (batch) => batch.code === item.batchCode && batch.initiativeName === initiative.name,
      ),
    ),
    batches: wall.batches.filter((batch) => batch.initiativeName === initiative.name),
  };
}

function sumLineItems(state: AyraState, batchId: string) {
  return state.batchLineItems
    .filter((lineItem) => lineItem.batchId === batchId)
    .reduce((sum, lineItem) => sum + lineItem.amountUsdc, 0);
}

export function formatUsdc(amount: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)} USDC`;
}

export function formatLocal(amount: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(amount)}`;
}
