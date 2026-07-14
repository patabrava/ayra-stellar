import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
  STELLAR_TESTNET_USDC_ISSUER,
  getConfiguredStellarNetwork,
  getStellarExpertTransactionUrl,
  resolveStellarNetworkConfig,
} from "../src/lib/ayra/stellar-network";

describe("AYRA Stellar network configuration", () => {
  it("resolves the historical testnet rail with its canonical proof endpoints", () => {
    const config = resolveStellarNetworkConfig("testnet", {});

    assert.equal(config.horizonUrl, "https://horizon-testnet.stellar.org");
    assert.equal(config.usdcIssuer, STELLAR_TESTNET_USDC_ISSUER);
    assert.equal(config.explorerNetwork, "testnet");
  });

  it("resolves pubnet to public Horizon and Circle Stellar USDC", () => {
    const config = resolveStellarNetworkConfig("pubnet", {});

    assert.equal(config.horizonUrl, "https://horizon.stellar.org");
    assert.equal(config.usdcIssuer, CIRCLE_STELLAR_MAINNET_USDC_ISSUER);
    assert.equal(config.explorerNetwork, "public");
  });

  it("defaults new records to testnet and rejects unknown configured values", () => {
    assert.equal(getConfiguredStellarNetwork({}), "testnet");
    assert.equal(
      getConfiguredStellarNetwork({ AYRA_STELLAR_NETWORK: "pubnet" }),
      "pubnet",
    );
    assert.throws(
      () => getConfiguredStellarNetwork({ AYRA_STELLAR_NETWORK: "mainnet" }),
      /AYRA_STELLAR_NETWORK must be testnet or pubnet/,
    );
  });

  it("rejects Horizon and issuer overrides that cross the network boundary", () => {
    assert.throws(
      () =>
        resolveStellarNetworkConfig("pubnet", {
          STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
        }),
      /STELLAR_HORIZON_URL does not match pubnet/,
    );
    assert.throws(
      () =>
        resolveStellarNetworkConfig("testnet", {
          STELLAR_USDC_ISSUER: CIRCLE_STELLAR_MAINNET_USDC_ISSUER,
        }),
      /STELLAR_USDC_ISSUER does not match testnet/,
    );
  });

  it("builds network-correct Stellar Expert links only for real hashes", () => {
    const hash = "a".repeat(64);
    assert.equal(
      getStellarExpertTransactionUrl(hash, "testnet"),
      `https://stellar.expert/explorer/testnet/tx/${hash}`,
    );
    assert.equal(
      getStellarExpertTransactionUrl(hash, "pubnet"),
      `https://stellar.expert/explorer/public/tx/${hash}`,
    );
    assert.equal(getStellarExpertTransactionUrl("mock-payment", "pubnet"), null);
  });
});
