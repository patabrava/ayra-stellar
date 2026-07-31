import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminCsv,
  buildStewardCsv,
} from "../src/lib/ayra/export";
import {
  createMockSdpGateway,
  buildSdpInstructionsCsv,
  createSdpGateway,
  createSdpGatewayForNetwork,
  createTestnetSdpGateway,
  SdpGatewayError,
  type SdpLineItemRef,
} from "../src/lib/ayra/sdp";

const sdpLineItems: SdpLineItemRef[] = [
  {
    id: "line-1",
    category: "Crew wages",
    amountUsdc: 1200,
    receiverEmail: "receiver@example.org",
    walletAddress: "GBTESTWALLETADDRESS000000000000000000000000000000000001",
  },
  {
    id: "line-2",
    category: "Tools",
    amountUsdc: 300.5,
    receiverEmail: "receiver@example.org",
    walletAddress: "GBTESTWALLETADDRESS000000000000000000000000000000000001",
    walletAddressMemo: "12345678",
  },
];

const testnetConfig = {
  baseUrl: "https://sdp.test",
  createAuthorization: "Bearer create-token",
  startAuthorization: "Bearer start-token",
  tenantName: "ayra",
  assetId: "asset-usdc",
  registrationContactType: "EMAIL_AND_WALLET_ADDRESS",
};

describe("AYRA SDP gateway and CSV exports", () => {
  it("keeps SDP asset configuration separate from Horizon USDC issuer verification", () => {
    const gateway = createSdpGateway({
      AYRA_SDP_MODE: "testnet",
      STELLAR_SDP_BASE_URL: "https://sdp-api.ayra.haus",
      STELLAR_SDP_CREATE_AUTHORIZATION: "SDP_create.secret",
      STELLAR_SDP_START_AUTHORIZATION: "SDP_start.secret",
      STELLAR_SDP_ASSET_ID: "1c486a48-afe9-4a15-9ee2-7c6ec5d59ccd",
      STELLAR_SDP_REGISTRATION_CONTACT_TYPE: "EMAIL_AND_WALLET_ADDRESS",
      STELLAR_USDC_ISSUER: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
    } as unknown as NodeJS.ProcessEnv);

    assert.ok(gateway);
  });

  it("loads pubnet SDP credentials from the isolated mainnet namespace", () => {
    const gateway = createSdpGatewayForNetwork("pubnet", {
      AYRA_SDP_MODE: "live",
      STELLAR_MAINNET_SDP_BASE_URL: "https://sdp-mainnet-api.ayra.haus",
      STELLAR_MAINNET_SDP_CREATE_AUTHORIZATION: "SDP_mainnet.create",
      STELLAR_MAINNET_SDP_START_AUTHORIZATION: "SDP_mainnet.start",
      STELLAR_MAINNET_SDP_ASSET_ID: "mainnet-usdc-asset",
      STELLAR_MAINNET_SDP_REGISTRATION_CONTACT_TYPE:
        "EMAIL_AND_WALLET_ADDRESS",
    } as unknown as NodeJS.ProcessEnv);

    assert.ok(gateway);
  });

  it("maps mock SDP submission and settlement through stable external ids", async () => {
    const gateway = createMockSdpGateway();
    const batch = { id: "batch-1", code: "PV-TEST-MAY26" };
    const lineItems = sdpLineItems;

    const submitted = await gateway.submitBatch(batch, lineItems);
    assert.equal(submitted.externalBatchId, "mock-sdp-pv-test-may26");
    assert.deepEqual(
      submitted.events.map((event) => event.action),
      ["create_batch", "upload_instructions", "mark_ready"],
    );
    assert.equal(submitted.payments[1]?.paymentId, "mock-payment-pv-test-may26-2");

    const settled = await gateway.syncStatus({
      ...batch,
      sdpBatchId: submitted.externalBatchId,
    }, lineItems);
    assert.equal(settled.events[0]?.action, "sync_status");
    assert.match(settled.payments[0]?.transactionHash ?? "", /^mock-tx-pv-test-may26-1/);
  });

  it("builds the official email and wallet-address SDP instruction CSV", () => {
    const csv = buildSdpInstructionsCsv(
      { id: "batch-1", code: "PV-TEST-MAY26" },
      sdpLineItems,
    );

    assert.equal(
      csv,
      [
        "email,walletAddress,walletAddressMemo,id,amount,paymentID",
        "receiver@example.org,GBTESTWALLETADDRESS000000000000000000000000000000000001,,line-1,1200,pv-test-may26-line-1",
        "receiver@example.org,GBTESTWALLETADDRESS000000000000000000000000000000000001,12345678,line-2,300.50,pv-test-may26-line-2",
        "",
      ].join("\n"),
    );
  });

  it("uses the Stellar SDP testnet API flow with separated create and start credentials", async () => {
    const calls: Array<{ url: string; init?: RequestInit; csv?: string }> = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      calls.push({ url, init });

      if (url.endsWith("/disbursements")) {
        assert.equal(init?.method, "POST");
        assert.equal(headers.get("Authorization"), "Bearer create-token");
        assert.equal(headers.get("SDP-Tenant-Name"), "ayra");
        assert.deepEqual(JSON.parse(String(init?.body)), {
          name: "PV-TEST-MAY26",
          asset_id: "asset-usdc",
          registration_contact_type: "EMAIL_AND_WALLET_ADDRESS",
          wallet_id: "",
          verification_field: "",
        });
        return Response.json({ id: "sdp-disbursement-1", status: "DRAFT" }, { status: 201 });
      }

      if (url.endsWith("/disbursements/sdp-disbursement-1/instructions")) {
        assert.equal(init?.method, "POST");
        assert.equal(headers.get("Authorization"), "Bearer create-token");
        assert.ok(init?.body instanceof FormData);
        const file = init.body.get("file");
        assert.ok(file && typeof file === "object" && "text" in file);
        calls[calls.length - 1].csv = await (file as Blob).text();
        return Response.json({ message: "File uploaded successfully" }, { status: 201 });
      }

      if (url.endsWith("/disbursements/sdp-disbursement-1/status")) {
        assert.equal(init?.method, "PATCH");
        assert.equal(headers.get("Authorization"), "Bearer start-token");
        assert.deepEqual(JSON.parse(String(init?.body)), { status: "STARTED" });
        return Response.json({ message: "Disbursement started" }, { status: 200 });
      }

      if (url.includes("/payments?")) {
        assert.equal(init?.method, "GET");
        assert.equal(headers.get("Authorization"), "Bearer create-token");
        const paymentId = new URL(url).searchParams.get("q");
        return Response.json({
          data: [
            {
              id: `sdp-${paymentId}`,
              external_payment_id: paymentId,
              status: "SUCCESS",
              stellar_transaction_id: `tx-${paymentId}`,
            },
          ],
          pagination: { pages: 1, total: 1 },
        });
      }

      return new Response("unexpected", { status: 500 });
    };

    const gateway = createTestnetSdpGateway(testnetConfig, fetchImpl);
    const submitted = await gateway.submitBatch(
      { id: "batch-1", code: "PV-TEST-MAY26" },
      sdpLineItems,
    );
    const synced = await gateway.syncStatus(
      {
        id: "batch-1",
        code: "PV-TEST-MAY26",
        sdpBatchId: submitted.externalBatchId,
      },
      sdpLineItems,
    );

    assert.equal(submitted.externalBatchId, "sdp-disbursement-1");
    assert.deepEqual(
      submitted.events.map((event) => event.action),
      ["create_batch", "upload_instructions", "mark_ready"],
    );
    assert.equal(submitted.payments[0]?.paymentId, "sdp-pv-test-may26-line-1");
    assert.equal(synced.payments[1]?.transactionHash, "tx-pv-test-may26-line-2");
    assert.match(calls.find((call) => call.csv)?.csv ?? "", /walletAddressMemo/);
  });

  it("retries instruction upload with the existing SDP receiver for a registered wallet", async () => {
    const lineItems = [sdpLineItems[0]!];
    const uploadCsvs: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);

      if (url.endsWith("/disbursements")) {
        return Response.json({ id: "sdp-disbursement-1", status: "DRAFT" }, { status: 201 });
      }

      if (url.endsWith("/disbursements/sdp-disbursement-1/instructions")) {
        assert.ok(init?.body instanceof FormData);
        const file = init.body.get("file");
        assert.ok(file && typeof file === "object" && "text" in file);
        uploadCsvs.push(await (file as Blob).text());
        if (uploadCsvs.length === 1) {
          return Response.json(
            {
              error: `wallet address ${lineItems[0].walletAddress} is already registered to another receiver: wallet address already in use`,
            },
            { status: 409 },
          );
        }
        return Response.json({ message: "File uploaded successfully" }, { status: 201 });
      }

      if (url.endsWith("/receivers?page=1&page_limit=100")) {
        return Response.json({
          pagination: { pages: 1, total: 1 },
          data: [
            {
              id: "receiver-existing",
              email: "existing-receiver@example.org",
              wallets: [
                {
                  stellar_address: lineItems[0].walletAddress.toLowerCase(),
                  status: "REGISTERED",
                },
              ],
            },
          ],
        });
      }

      if (url.endsWith("/disbursements/sdp-disbursement-1/status")) {
        return Response.json({ message: "Disbursement started" }, { status: 200 });
      }

      if (url.includes("/payments?")) {
        const paymentId = new URL(url).searchParams.get("q");
        return Response.json({
          data: [
            {
              id: `sdp-${paymentId}`,
              external_payment_id: paymentId,
              status: "SUCCESS",
            },
          ],
        });
      }

      return new Response("unexpected", { status: 500 });
    };

    const gateway = createTestnetSdpGateway(testnetConfig, fetchImpl);
    const submitted = await gateway.submitBatch(
      { id: "batch-1", code: "PV-TEST-MAY26" },
      lineItems,
    );

    assert.equal(uploadCsvs.length, 2);
    assert.match(uploadCsvs[0] ?? "", /^receiver@example\.org,/m);
    assert.match(uploadCsvs[1] ?? "", /^existing-receiver@example\.org,/m);
    assert.equal(submitted.payments[0]?.paymentId, "sdp-pv-test-may26-line-1");
  });

  it("reuses an existing draft SDP disbursement after a duplicate create conflict", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method} ${new URL(url).pathname}${new URL(url).search}`);

      if (url.endsWith("/disbursements")) {
        return Response.json({ error: "disbursement already exists" }, { status: 409 });
      }

      if (url.endsWith("/disbursements?q=PV-TEST-MAY26&page=1&page_limit=20")) {
        return Response.json({
          pagination: { pages: 1, total: 1 },
          data: [
            {
              id: "sdp-existing-draft",
              name: "PV-TEST-MAY26",
              status: "DRAFT",
              asset: { id: "asset-usdc" },
              registration_contact_type: "EMAIL_AND_WALLET_ADDRESS",
            },
          ],
        });
      }

      if (url.endsWith("/disbursements/sdp-existing-draft/instructions")) {
        return Response.json({ message: "File uploaded successfully" }, { status: 201 });
      }

      if (url.endsWith("/disbursements/sdp-existing-draft/status")) {
        return Response.json({ message: "Disbursement started" }, { status: 200 });
      }

      if (url.includes("/payments?")) {
        const paymentId = new URL(url).searchParams.get("q");
        return Response.json({
          data: [
            {
              id: `sdp-${paymentId}`,
              external_payment_id: paymentId,
              status: "SUCCESS",
            },
          ],
        });
      }

      return new Response("unexpected", { status: 500 });
    };

    const gateway = createTestnetSdpGateway(testnetConfig, fetchImpl);
    const submitted = await gateway.submitBatch(
      { id: "batch-1", code: "PV-TEST-MAY26" },
      [sdpLineItems[0]!],
    );

    assert.equal(submitted.externalBatchId, "sdp-existing-draft");
    assert.ok(calls.includes("GET /disbursements?q=PV-TEST-MAY26&page=1&page_limit=20"));
    assert.ok(calls.includes("POST /disbursements/sdp-existing-draft/instructions"));
  });

  it("does not map broad SDP payment search results without an exact payment id match", async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith("/disbursements")) {
        return Response.json({ id: "sdp-disbursement-1", status: "DRAFT" }, { status: 201 });
      }
      if (url.endsWith("/disbursements/sdp-disbursement-1/instructions")) {
        return Response.json({ message: "File uploaded successfully" }, { status: 201 });
      }
      if (url.endsWith("/disbursements/sdp-disbursement-1/status")) {
        return Response.json({ message: "Disbursement started" }, { status: 200 });
      }
      if (url.includes("/payments?")) {
        assert.equal(init?.method, "GET");
        return Response.json({
          data: [
            {
              id: "unrelated-sdp-payment",
              external_payment_id: "unrelated-external-payment",
              status: "SUCCESS",
              stellar_transaction_id: "unrelated-tx",
            },
          ],
          pagination: { pages: 1, total: 1 },
        });
      }
      return new Response("unexpected", { status: 500 });
    };

    const gateway = createTestnetSdpGateway(testnetConfig, fetchImpl);
    const submitted = await gateway.submitBatch(
      { id: "batch-1", code: "PV-TEST-MAY26" },
      sdpLineItems,
    );
    const synced = await gateway.syncStatus(
      {
        id: "batch-1",
        code: "PV-TEST-MAY26",
        sdpBatchId: submitted.externalBatchId,
      },
      sdpLineItems,
    );

    assert.deepEqual(synced.payments, []);
  });

  it("prefers retrieving the stored SDP payment id before falling back to search", async () => {
    const calls: string[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push(`${init?.method} ${new URL(url).pathname}${new URL(url).search}`);

      if (url.endsWith("/disbursements")) {
        return Response.json({ id: "sdp-disbursement-1", status: "DRAFT" }, { status: 201 });
      }
      if (url.endsWith("/disbursements/sdp-disbursement-1/instructions")) {
        return Response.json({ message: "File uploaded successfully" }, { status: 201 });
      }
      if (url.endsWith("/disbursements/sdp-disbursement-1/status")) {
        return Response.json({ message: "Disbursement started" }, { status: 200 });
      }
      if (url.endsWith("/payments/sdp-pv-test-may26-line-1")) {
        return Response.json({
          id: "sdp-pv-test-may26-line-1",
          external_payment_id: "pv-test-may26-line-1",
          status: "SUCCESS",
          stellar_transaction_id: "tx-direct-line-1",
        });
      }
      if (url.includes("/payments?")) {
        return Response.json({ data: [], pagination: { pages: 1, total: 0 } });
      }

      return new Response("unexpected", { status: 500 });
    };

    const gateway = createTestnetSdpGateway(testnetConfig, fetchImpl);
    const synced = await gateway.syncStatus(
      {
        id: "batch-1",
        code: "PV-TEST-MAY26",
        sdpBatchId: "sdp-disbursement-1",
      },
      [
        {
          ...sdpLineItems[0]!,
          sdpPaymentId: "sdp-pv-test-may26-line-1",
        },
      ],
    );

    assert.equal(synced.payments[0]?.transactionHash, "tx-direct-line-1");
    assert.ok(calls.includes("GET /payments/sdp-pv-test-may26-line-1"));
    assert.ok(!calls.some((call) => call.includes("/payments?q=pv-test-may26-line-1")));
  });

  it("fails fast on missing testnet env and sanitizes non-2xx SDP errors", async () => {
    assert.throws(
      () =>
        createSdpGateway({
          AYRA_SDP_MODE: "testnet",
        } as unknown as NodeJS.ProcessEnv),
      /Missing STELLAR_SDP_BASE_URL/,
    );

    const gateway = createTestnetSdpGateway(
      testnetConfig,
      async () => new Response("secret-token-value", { status: 500 }),
    );
    await assert.rejects(
      () =>
        gateway.submitBatch(
          { id: "batch-1", code: "PV-TEST-MAY26" },
          sdpLineItems,
        ),
      (error) => {
        assert.ok(error instanceof SdpGatewayError);
        assert.equal(error.events[0]?.status, "error");
        assert.doesNotMatch(error.message, /secret-token-value/);
        return true;
      },
    );
  });

  it("keeps instruction upload failures on the upload action", async () => {
    const gateway = createTestnetSdpGateway(testnetConfig, async (input) => {
      const url = String(input);
      if (url.endsWith("/disbursements")) {
        return Response.json({ id: "sdp-disbursement-1", status: "DRAFT" }, { status: 201 });
      }
      if (url.endsWith("/disbursements/sdp-disbursement-1/instructions")) {
        return new Response("secret-token-value", { status: 500 });
      }
      return new Response("unexpected", { status: 500 });
    });

    await assert.rejects(
      () =>
        gateway.submitBatch(
          { id: "batch-1", code: "PV-TEST-MAY26" },
          sdpLineItems,
        ),
      (error) => {
        assert.ok(error instanceof SdpGatewayError);
        assert.equal(error.events[0]?.action, "create_batch");
        assert.equal(error.events[1]?.action, "upload_instructions");
        assert.doesNotMatch(error.message, /secret-token-value/);
        return true;
      },
    );
  });

  it("exports admin and steward CSV without leaking private receipt paths publicly", () => {
    const rows = buildAdminCsv({
      batches: [
        {
          code: "PV-TEST-MAY26",
          periodLabel: "May 2026",
          status: "settled",
          initiativeName: "Reforestation",
          category: "Crew wages",
          amountUsdc: 1200,
          localAmount: 4_680_000,
          localCurrency: "COP",
          sdpPaymentId: "mock-payment-1",
          transactionHash: "mock-tx-1",
          privateReceiptPath: "receipts/batch-1/crew.pdf",
        },
      ],
    });
    assert.match(rows, /private_receipt_path/);
    assert.match(rows, /receipts\/batch-1\/crew\.pdf/);

    const stewardRows = buildStewardCsv({
      rows: [
        {
          code: "PV-TEST-MAY26",
          periodLabel: "May 2026",
          status: "settled",
          category: "Crew wages",
          amountUsdc: 1200,
          localAmount: 4_680_000,
          localCurrency: "COP",
          sdpPaymentId: "mock-payment-1",
          transactionHash: "mock-tx-1",
        },
      ],
    });
    assert.match(stewardRows, /PV-TEST-MAY26/);
    assert.doesNotMatch(stewardRows, /private_receipt/);
  });
});
