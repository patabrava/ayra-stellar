import {
  getConfiguredStellarNetwork,
  type StellarNetwork,
} from "@/lib/ayra/stellar-network";

export type SdpBatchRef = {
  id: string;
  code: string;
  sdpBatchId?: string | null;
};

export type SdpLineItemRef = {
  id: string;
  category: string;
  amountUsdc: number;
  sdpPaymentId?: string | null;
  receiverEmail: string;
  walletAddress: string;
  walletAddressMemo?: string | null;
};

export type SdpGatewayEvent = {
  provider: "mock" | "stellar-sdp";
  action: "create_batch" | "upload_instructions" | "mark_ready" | "sync_status";
  status: "ok" | "error";
  externalId?: string;
  message?: string;
};

export type SdpSubmittedPayment = {
  lineItemId: string;
  paymentId: string;
};

export type SdpSettledPayment = {
  lineItemId: string;
  transactionHash: string;
  assetCode?: "USDC";
  assetIssuer?: string;
  assetAmount?: number;
};

export type SdpSubmitResult = {
  externalBatchId: string;
  payments: SdpSubmittedPayment[];
  events: SdpGatewayEvent[];
};

export type SdpSyncResult = {
  payments: SdpSettledPayment[];
  events: SdpGatewayEvent[];
};

export type SdpGateway = {
  submitBatch: (
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) => Promise<SdpSubmitResult>;
  syncStatus: (
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) => Promise<SdpSyncResult>;
};

export type TestnetSdpGatewayConfig = {
  baseUrl: string;
  createAuthorization: string;
  startAuthorization: string;
  tenantName?: string;
  assetId: string;
  registrationContactType: string;
};

type FetchLike = typeof fetch;

type SdpDisbursementResponse = {
  id?: string;
  name?: string;
  status?: string;
  asset?: {
    id?: string;
  };
  registration_contact_type?: string;
};

type SdpPaymentResponse = {
  id?: string;
  status?: string;
  stellar_transaction_id?: string;
  external_payment_id?: string;
};

type SdpReceiverResponse = {
  id?: string;
  email?: string;
  wallets?: Array<{
    stellar_address?: string;
    status?: string;
  }>;
};

export class SdpGatewayError extends Error {
  events: SdpGatewayEvent[];

  constructor(message: string, events: SdpGatewayEvent[]) {
    super(message);
    this.name = "SdpGatewayError";
    this.events = events;
  }
}

class SdpHttpError extends Error {
  action: SdpGatewayEvent["action"];
  status: number;
  body: string;

  constructor(action: SdpGatewayEvent["action"], status: number, body: string) {
    super(sdpHttpErrorMessage(action, status, body));
    this.name = "SdpHttpError";
    this.action = action;
    this.status = status;
    this.body = body;
  }
}

function idCode(code: string) {
  return code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function paymentExternalId(batch: SdpBatchRef, lineItem: SdpLineItemRef) {
  return `${idCode(batch.code)}-${lineItem.id}`;
}

function csvValue(value: string | number | null | undefined) {
  const text = value == null ? "" : String(value);
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replaceAll('"', '""')}"`;
}

function amountValue(value: number) {
  return value.toFixed(2).replace(/\.00$/, "");
}

export function buildSdpInstructionsCsv(
  batch: SdpBatchRef,
  lineItems: SdpLineItemRef[],
) {
  const rows = [
    ["email", "walletAddress", "walletAddressMemo", "id", "amount", "paymentID"],
    ...lineItems.map((lineItem) => [
      lineItem.receiverEmail,
      lineItem.walletAddress,
      lineItem.walletAddressMemo ?? "",
      lineItem.id,
      amountValue(lineItem.amountUsdc),
      paymentExternalId(batch, lineItem),
    ]),
  ];
  return `${rows.map((row) => row.map(csvValue).join(",")).join("\n")}\n`;
}

export function createMockSdpGateway(): SdpGateway {
  return {
    async submitBatch(batch, lineItems) {
      const code = idCode(batch.code);
      const externalBatchId = `mock-sdp-${code}`;
      return {
        externalBatchId,
        payments: lineItems.map((lineItem, index) => ({
          lineItemId: lineItem.id,
          paymentId: `mock-payment-${code}-${index + 1}`,
        })),
        events: [
          {
            provider: "mock",
            action: "create_batch",
            status: "ok",
            externalId: externalBatchId,
          },
          {
            provider: "mock",
            action: "upload_instructions",
            status: "ok",
            externalId: externalBatchId,
            message: `${lineItems.length} instruction(s) uploaded`,
          },
          {
            provider: "mock",
            action: "mark_ready",
            status: "ok",
            externalId: externalBatchId,
          },
        ],
      };
    },
    async syncStatus(batch, lineItems) {
      const code = idCode(batch.code);
      return {
        payments: lineItems.map((lineItem, index) => ({
          lineItemId: lineItem.id,
          transactionHash: `mock-tx-${code}-${index + 1}`,
        })),
        events: [
          {
            provider: "mock",
            action: "sync_status",
            status: "ok",
            externalId: batch.sdpBatchId ?? `mock-sdp-${code}`,
            message: `${lineItems.length} payment(s) settled`,
          },
        ],
      };
    },
  };
}

export function createTestnetSdpGateway(
  config: TestnetSdpGatewayConfig,
  fetchImpl: FetchLike = fetch,
): SdpGateway {
  const client = new TestnetSdpClient(config, fetchImpl);
  return {
    async submitBatch(batch, lineItems) {
      const events: SdpGatewayEvent[] = [];
      try {
        const disbursement = await client.createDisbursement(batch);
        const externalBatchId = disbursement.id;
        events.push({
          provider: "stellar-sdp",
          action: "create_batch",
          status: "ok",
          externalId: externalBatchId,
        });

        await client.uploadInstructions(externalBatchId, batch, lineItems);
        events.push({
          provider: "stellar-sdp",
          action: "upload_instructions",
          status: "ok",
          externalId: externalBatchId,
          message: `${lineItems.length} instruction(s) uploaded`,
        });

        await client.startDisbursement(externalBatchId);
        events.push({
          provider: "stellar-sdp",
          action: "mark_ready",
          status: "ok",
          externalId: externalBatchId,
        });

        const payments = await client.lookupPayments(batch, lineItems);
        return {
          externalBatchId,
          payments: payments.map(({ lineItem, payment }) => ({
            lineItemId: lineItem.id,
            paymentId: payment.id ?? payment.external_payment_id ?? paymentExternalId(batch, lineItem),
          })),
          events,
        };
      } catch (error) {
        const event = toErrorEvent(
          "stellar-sdp",
          sdpErrorAction(error, "create_batch"),
          error,
        );
        events.push(event);
        throw new SdpGatewayError(event.message ?? "SDP submit failed", events);
      }
    },
    async syncStatus(batch, lineItems) {
      const events: SdpGatewayEvent[] = [];
      try {
        const payments = await client.lookupPayments(batch, lineItems);
        events.push({
          provider: "stellar-sdp",
          action: "sync_status",
          status: "ok",
          externalId: batch.sdpBatchId ?? undefined,
          message: `${payments.length} payment(s) mapped`,
        });
        return {
          payments: payments
            .filter(({ payment }) => payment.stellar_transaction_id)
            .map(({ lineItem, payment }) => ({
              lineItemId: lineItem.id,
              transactionHash: payment.stellar_transaction_id!,
            })),
          events,
        };
      } catch (error) {
        const event = toErrorEvent(
          "stellar-sdp",
          sdpErrorAction(error, "sync_status"),
          error,
        );
        events.push(event);
        throw new SdpGatewayError(event.message ?? "SDP sync failed", events);
      }
    },
  };
}

class TestnetSdpClient {
  private config: TestnetSdpGatewayConfig;
  private fetchImpl: FetchLike;

  constructor(config: TestnetSdpGatewayConfig, fetchImpl: FetchLike) {
    this.config = config;
    this.fetchImpl = fetchImpl;
  }

  async createDisbursement(
    batch: SdpBatchRef,
  ): Promise<SdpDisbursementResponse & { id: string }> {
    try {
      const json = await this.requestJson<SdpDisbursementResponse>(
        "/disbursements",
        {
          method: "POST",
          authorization: this.config.createAuthorization,
          json: {
            name: batch.code,
            asset_id: this.config.assetId,
            registration_contact_type: this.config.registrationContactType,
            wallet_id: "",
            verification_field: "",
          },
        },
        "create_batch",
      );
      if (!json.id) throw new Error("SDP create response did not include id");
      return { ...json, id: json.id };
    } catch (error) {
      if (!isDuplicateDisbursementConflict(error)) throw error;
      const existing = await this.findReusableDisbursement(batch).catch(() => null);
      if (!existing?.id) throw error;
      return { ...existing, id: existing.id };
    }
  }

  async uploadInstructions(
    disbursementId: string,
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) {
    try {
      await this.uploadInstructionsWithLineItems(disbursementId, batch, lineItems);
      return;
    } catch (error) {
      if (!isDuplicateWalletConflict(error)) throw error;

      const resolvedLineItems =
        await this.lineItemsWithRegisteredReceiverEmails(lineItems).catch(() => null);
      if (!resolvedLineItems || !hasReceiverEmailChange(lineItems, resolvedLineItems)) {
        throw error;
      }

      await this.uploadInstructionsWithLineItems(
        disbursementId,
        batch,
        resolvedLineItems,
      );
    }
  }

  private async uploadInstructionsWithLineItems(
    disbursementId: string,
    batch: SdpBatchRef,
    lineItems: SdpLineItemRef[],
  ) {
    const body = new FormData();
    body.set(
      "file",
      new Blob([buildSdpInstructionsCsv(batch, lineItems)], { type: "text/csv" }),
      `${idCode(batch.code)}.csv`,
    );

    await this.requestText(
      `/disbursements/${encodeURIComponent(disbursementId)}/instructions`,
      {
        method: "POST",
        authorization: this.config.createAuthorization,
        body,
      },
      "upload_instructions",
    );
  }

  private async lineItemsWithRegisteredReceiverEmails(
    lineItems: SdpLineItemRef[],
  ) {
    const receivers = await this.listReceivers();
    const receiverEmailByWallet = new Map<string, string>();
    for (const receiver of receivers) {
      if (!receiver.email) continue;
      for (const wallet of receiver.wallets ?? []) {
        if (
          wallet.status === "REGISTERED" &&
          wallet.stellar_address
        ) {
          receiverEmailByWallet.set(
            normalizeStellarAddress(wallet.stellar_address),
            receiver.email,
          );
        }
      }
    }

    return lineItems.map((lineItem) => {
      const receiverEmail = receiverEmailByWallet.get(
        normalizeStellarAddress(lineItem.walletAddress),
      );
      return receiverEmail && receiverEmail !== lineItem.receiverEmail
        ? { ...lineItem, receiverEmail }
        : lineItem;
    });
  }

  private async listReceivers() {
    const receivers: SdpReceiverResponse[] = [];
    const pageLimit = 100;
    const maxPages = 10;
    for (let page = 1; page <= maxPages; page += 1) {
      const json = await this.requestJson<unknown>(
        `/receivers?page=${page}&page_limit=${pageLimit}`,
        {
          method: "GET",
          authorization: this.config.createAuthorization,
        },
        "upload_instructions",
      );
      receivers.push(...extractReceivers(json));
      const pages = extractPaginationPages(json);
      if (!pages || page >= pages) break;
    }
    return receivers;
  }

  private async findReusableDisbursement(batch: SdpBatchRef) {
    const json = await this.requestJson<unknown>(
      `/disbursements?q=${encodeURIComponent(batch.code)}&page=1&page_limit=20`,
      {
        method: "GET",
        authorization: this.config.createAuthorization,
      },
      "create_batch",
    );
    return extractDisbursements(json).find(
      (item) =>
        item.name === batch.code &&
        (item.status === "DRAFT" || item.status === "READY") &&
        item.asset?.id === this.config.assetId &&
        item.registration_contact_type === this.config.registrationContactType,
    );
  }

  async startDisbursement(disbursementId: string) {
    await this.requestJson<{ message?: string }>(
      `/disbursements/${encodeURIComponent(disbursementId)}/status`,
      {
        method: "PATCH",
        authorization: this.config.startAuthorization,
        json: { status: "STARTED" },
      },
      "mark_ready",
    );
  }

  async lookupPayments(batch: SdpBatchRef, lineItems: SdpLineItemRef[]) {
    const results: Array<{ lineItem: SdpLineItemRef; payment: SdpPaymentResponse }> = [];
    for (const lineItem of lineItems) {
      const expectedPaymentId = paymentExternalId(batch, lineItem);
      const payment = lineItem.sdpPaymentId
        ? await this.retrievePayment(lineItem.sdpPaymentId).catch(() => null)
        : null;
      const resolvedPayment =
        payment && paymentBelongsToLineItem(payment, expectedPaymentId)
          ? payment
          : await this.searchPayment(expectedPaymentId);
      if (resolvedPayment) results.push({ lineItem, payment: resolvedPayment });
    }
    return results;
  }

  private async retrievePayment(paymentId: string) {
    return this.requestJson<SdpPaymentResponse>(
      `/payments/${encodeURIComponent(paymentId)}`,
      {
        method: "GET",
        authorization: this.config.createAuthorization,
      },
      "sync_status",
    );
  }

  private async searchPayment(expectedPaymentId: string) {
    const json = await this.requestJson<unknown>(
      `/payments?q=${encodeURIComponent(expectedPaymentId)}&type=DISBURSEMENT`,
      {
        method: "GET",
        authorization: this.config.createAuthorization,
      },
      "sync_status",
    );
    return extractPayments(json).find((item) =>
      paymentBelongsToLineItem(item, expectedPaymentId),
    );
  }

  private headers(authorization: string, json: boolean) {
    const headers = new Headers();
    headers.set("Authorization", authorization);
    if (this.config.tenantName) headers.set("SDP-Tenant-Name", this.config.tenantName);
    if (json) headers.set("Content-Type", "application/json");
    return headers;
  }

  private async requestJson<T>(
    path: string,
    init: {
      method: string;
      authorization: string;
      json?: unknown;
      body?: BodyInit;
    },
    action: SdpGatewayEvent["action"],
  ): Promise<T> {
    const response = await this.fetchImpl(this.url(path), {
      method: init.method,
      headers: this.headers(init.authorization, init.json !== undefined),
      body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
    });
    if (!response.ok) throw await sdpHttpError(action, response);
    return (await response.json()) as T;
  }

  private async requestText(
    path: string,
    init: {
      method: string;
      authorization: string;
      body?: BodyInit;
    },
    action: SdpGatewayEvent["action"],
  ) {
    const response = await this.fetchImpl(this.url(path), {
      method: init.method,
      headers: this.headers(init.authorization, false),
      body: init.body,
    });
    if (!response.ok) throw await sdpHttpError(action, response);
    return response.text();
  }

  private url(path: string) {
    return `${this.config.baseUrl.replace(/\/+$/, "")}${path}`;
  }
}

async function sdpHttpError(action: SdpGatewayEvent["action"], response: Response) {
  const body = await response.text().catch(() => "");
  return new SdpHttpError(action, response.status, body);
}

function sdpHttpErrorMessage(
  action: SdpGatewayEvent["action"],
  status: number,
  body: string,
) {
  if (status === 409 && /wallet address .*already registered to another receiver/i.test(body)) {
    return `SDP ${action} failed: wallet address is already registered to another SDP receiver.`;
  }
  if (status === 409 && /disbursement already exists/i.test(body)) {
    return `SDP ${action} failed: disbursement already exists.`;
  }
  return `SDP ${action} failed with HTTP ${status}`;
}

function sdpErrorAction(
  error: unknown,
  fallback: SdpGatewayEvent["action"],
) {
  return error instanceof SdpHttpError ? error.action : fallback;
}

function isDuplicateWalletConflict(error: unknown) {
  return (
    error instanceof SdpHttpError &&
    error.status === 409 &&
    /wallet address .*already registered to another receiver/i.test(error.body)
  );
}

function isDuplicateDisbursementConflict(error: unknown) {
  return (
    error instanceof SdpHttpError &&
    error.status === 409 &&
    /disbursement already exists/i.test(error.body)
  );
}

function toErrorEvent(
  provider: SdpGatewayEvent["provider"],
  action: SdpGatewayEvent["action"],
  error: unknown,
): SdpGatewayEvent {
  return {
    provider,
    action,
    status: "error",
    message: error instanceof Error ? error.message : "Unknown SDP error",
  };
}

function extractPayments(json: unknown): SdpPaymentResponse[] {
  if (Array.isArray(json)) return json.filter(isPayment);
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data.filter(isPayment);
    if (isPayment(data)) return [data];
    if (isPayment(json)) return [json];
  }
  return [];
}

function paymentBelongsToLineItem(
  payment: SdpPaymentResponse,
  expectedPaymentId: string,
) {
  return (
    payment.external_payment_id === expectedPaymentId ||
    payment.id === expectedPaymentId
  );
}

function extractReceivers(json: unknown): SdpReceiverResponse[] {
  if (Array.isArray(json)) return json.filter(isReceiver);
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data.filter(isReceiver);
    if (isReceiver(data)) return [data];
    if (isReceiver(json)) return [json];
  }
  return [];
}

function extractDisbursements(json: unknown): SdpDisbursementResponse[] {
  if (Array.isArray(json)) return json.filter(isDisbursement);
  if (json && typeof json === "object") {
    const data = (json as { data?: unknown }).data;
    if (Array.isArray(data)) return data.filter(isDisbursement);
    if (isDisbursement(data)) return [data];
    if (isDisbursement(json)) return [json];
  }
  return [];
}

function extractPaginationPages(json: unknown) {
  if (!json || typeof json !== "object") return null;
  const pages = (json as { pagination?: { pages?: unknown } }).pagination?.pages;
  return typeof pages === "number" && Number.isFinite(pages) ? pages : null;
}

function isPayment(value: unknown): value is SdpPaymentResponse {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function isReceiver(value: unknown): value is SdpReceiverResponse {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function isDisbursement(value: unknown): value is SdpDisbursementResponse {
  return Boolean(value && typeof value === "object" && "id" in value);
}

function normalizeStellarAddress(value: string) {
  return value.trim().toUpperCase();
}

function hasReceiverEmailChange(
  original: SdpLineItemRef[],
  resolved: SdpLineItemRef[],
) {
  return original.some(
    (lineItem, index) => lineItem.receiverEmail !== resolved[index]?.receiverEmail,
  );
}

export function createSdpGateway(
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
) {
  return createSdpGatewayForNetwork(
    getConfiguredStellarNetwork(env),
    env,
    fetchImpl,
  );
}

export function createSdpGatewayForNetwork(
  network: StellarNetwork,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
) {
  const mode = env.AYRA_SDP_MODE ?? "mock";
  if (mode === "mock") return createMockSdpGateway();
  if (mode !== "testnet" && mode !== "pubnet" && mode !== "live") {
    throw new Error("AYRA_SDP_MODE must be mock, testnet, pubnet, or live.");
  }

  return createTestnetSdpGateway(
    network === "pubnet" ? readMainnetConfig(env) : readTestnetConfig(env),
    fetchImpl,
  );
}

function readTestnetConfig(env: NodeJS.ProcessEnv): TestnetSdpGatewayConfig {
  const config = {
    baseUrl: requiredEnv(env, "STELLAR_SDP_BASE_URL"),
    createAuthorization: requiredEnv(env, "STELLAR_SDP_CREATE_AUTHORIZATION"),
    startAuthorization:
      env.STELLAR_SDP_START_AUTHORIZATION ||
      requiredEnv(env, "STELLAR_SDP_CREATE_AUTHORIZATION"),
    tenantName: env.STELLAR_SDP_TENANT_NAME || undefined,
    assetId: requiredEnv(env, "STELLAR_SDP_ASSET_ID"),
    registrationContactType:
      env.STELLAR_SDP_REGISTRATION_CONTACT_TYPE || "EMAIL_AND_WALLET_ADDRESS",
  };
  if (config.registrationContactType !== "EMAIL_AND_WALLET_ADDRESS") {
    throw new Error(
      "AYRA MVP supports STELLAR_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS.",
    );
  }
  return config;
}

function readMainnetConfig(env: NodeJS.ProcessEnv): TestnetSdpGatewayConfig {
  const config = {
    baseUrl: requiredEnv(env, "STELLAR_MAINNET_SDP_BASE_URL"),
    createAuthorization: requiredEnv(
      env,
      "STELLAR_MAINNET_SDP_CREATE_AUTHORIZATION",
    ),
    startAuthorization:
      env.STELLAR_MAINNET_SDP_START_AUTHORIZATION ||
      requiredEnv(env, "STELLAR_MAINNET_SDP_CREATE_AUTHORIZATION"),
    tenantName: env.STELLAR_MAINNET_SDP_TENANT_NAME || undefined,
    assetId: requiredEnv(env, "STELLAR_MAINNET_SDP_ASSET_ID"),
    registrationContactType:
      env.STELLAR_MAINNET_SDP_REGISTRATION_CONTACT_TYPE ||
      "EMAIL_AND_WALLET_ADDRESS",
  };
  if (config.registrationContactType !== "EMAIL_AND_WALLET_ADDRESS") {
    throw new Error(
      "AYRA MVP supports STELLAR_MAINNET_SDP_REGISTRATION_CONTACT_TYPE=EMAIL_AND_WALLET_ADDRESS.",
    );
  }
  return config;
}

function requiredEnv(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Missing ${key}.`);
  return value;
}
