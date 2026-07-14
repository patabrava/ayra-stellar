import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

describe("AYRA isolated mainnet SDP deployment", () => {
  it("pins a separate pubnet stack with MFA and public proof endpoints", () => {
    const compose = readFileSync(
      "deploy/hostinger-sdp-mainnet/docker-compose.yml",
      "utf8",
    );

    assert.match(compose, /^name: ayra-sdp-mainnet/m);
    assert.match(compose, /stellar-disbursement-platform-backend:6\.6\.1/);
    assert.match(compose, /stellar-disbursement-platform-frontend:6\.6\.0/);
    assert.match(compose, /NETWORK_TYPE: pubnet/);
    assert.match(
      compose,
      /NETWORK_PASSPHRASE: "Public Global Stellar Network ; September 2015"/,
    );
    assert.match(compose, /HORIZON_URL: https:\/\/horizon\.stellar\.org/);
    assert.match(compose, /STELLAR_EXPERT_URL: "https:\/\/stellar\.expert\/explorer\/public"/);
    assert.match(compose, /DISABLE_MFA: "false"/);
    assert.match(
      compose,
      /until \.\/stellar-disbursement-platform channel-accounts ensure 1/,
    );
    assert.match(
      compose,
      /if ! \.\/stellar-disbursement-platform tenants ensure-default/,
    );
    assert.match(
      compose,
      /Default tenant provisioning deferred until authorized mainnet funding/,
    );
    assert.doesNotMatch(compose, /horizon-testnet|explorer\/testnet|--disable-mfa/);
  });

  it("documents isolated hosts and leaves all secret material blank", () => {
    const env = readFileSync(
      "deploy/hostinger-sdp-mainnet/.env.example",
      "utf8",
    );

    assert.match(env, /DATABASE_NAME=sdp_ayra_mainnet/);
    assert.match(env, /SDP_API_HOST=sdp-mainnet-api\.ayra\.haus/);
    assert.match(env, /SDP_DASHBOARD_HOST=sdp-mainnet-dashboard\.ayra\.haus/);
    for (const key of [
      "POSTGRES_PASSWORD",
      "ADMIN_API_KEY",
      "DISTRIBUTION_PUBLIC_KEY",
      "DISTRIBUTION_SEED",
      "SEP10_SIGNING_PUBLIC_KEY",
      "SEP10_SIGNING_PRIVATE_KEY",
      "SEP24_JWT_SECRET",
      "EC256_PRIVATE_KEY",
    ]) {
      assert.match(env, new RegExp(`^${key}=$`, "m"));
    }
  });

  it("ships a non-spending readiness verifier and an explicit live-payment gate", () => {
    const verifier = readFileSync("scripts/verify-sdp-mainnet.mjs", "utf8");

    assert.match(verifier, /https:\/\/horizon\.stellar\.org/);
    assert.match(verifier, /GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN/);
    assert.match(verifier, /mainnetUsdcReady/);
    assert.doesNotMatch(verifier, /submitBatch|createDisbursement|startDisbursement/);
  });
});
