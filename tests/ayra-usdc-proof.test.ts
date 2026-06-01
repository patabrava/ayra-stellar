import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  verifyStellarUsdcPayment,
  StellarProofError,
} from "../src/lib/ayra/stellar-proof";

const hash = "9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6";
const issuer = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const destination = "GAYRADESTINATION7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZL";

function horizonResponse(record: Record<string, unknown>) {
  return {
    _embedded: {
      records: [record],
    },
  };
}

describe("Stellar USDC proof verifier", () => {
  it("accepts a USDC payment with the expected issuer and amount", async () => {
    const proof = await verifyStellarUsdcPayment(
      {
        transactionHash: hash,
        expectedAmount: 1,
        expectedIssuer: issuer,
        expectedDestination: destination,
        horizonUrl: "https://horizon-testnet.stellar.org",
      },
      async (input) => {
        assert.equal(
          String(input),
          `https://horizon-testnet.stellar.org/transactions/${hash}/operations`,
        );
        return Response.json(
          horizonResponse({
            type: "payment",
            transaction_successful: true,
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: issuer,
            to: destination,
            amount: "1.0000000",
          }),
        );
      },
    );

    assert.deepEqual(proof, {
      assetCode: "USDC",
      assetIssuer: issuer,
      assetAmount: 1,
    });
  });

  it("rejects native XLM payments even when the amount matches", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash:
              "4ee20870c7d17a13234d36a1c8d9f285a68defa3a8ec4172de1ad58f7acc8783",
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "native",
                amount: "1.0000000",
              }),
            ),
        ),
      (error) => {
        assert.ok(error instanceof StellarProofError);
        assert.match(error.message, /Expected USDC payment/);
        return true;
      },
    );
  });

  it("rejects payment records without explicit transaction success", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: issuer,
                amount: "1.0000000",
              }),
            ),
        ),
      /No successful payment operation/,
    );
  });

  it("rejects malformed non-credit USDC-like payment records", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "liquidity_pool_shares",
                asset_code: "USDC",
                asset_issuer: issuer,
                amount: "1.0000000",
              }),
            ),
        ),
      /Expected USDC payment/,
    );
  });

  it("rejects a USDC payment from the wrong issuer", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 1,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: "GWRONGISSUER00000000000000000000000000000000000000000001",
                amount: "1.0000000",
              }),
            ),
        ),
      /Unexpected USDC issuer/,
    );
  });

  it("rejects a USDC payment to a different destination", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 1,
            expectedIssuer: issuer,
            expectedDestination: destination,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: issuer,
                to: "GWRONGDESTINATIONP7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZL",
                amount: "1.0000000",
              }),
            ),
        ),
      /Unexpected USDC destination/,
    );
  });

  it("rejects amount mismatches", async () => {
    await assert.rejects(
      () =>
        verifyStellarUsdcPayment(
          {
            transactionHash: hash,
            expectedAmount: 2,
            expectedIssuer: issuer,
            horizonUrl: "https://horizon-testnet.stellar.org",
          },
          async () =>
            Response.json(
              horizonResponse({
                type: "payment",
                transaction_successful: true,
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                asset_issuer: issuer,
                amount: "1.0000000",
              }),
            ),
        ),
      /amount mismatch/,
    );
  });
});
