# AYRA Stellar Hostinger SDP Verification Handoff

## Goal

Verify the deployed Hostinger SDP container, find the real failure boundary in the hosted E2E flow, and prove the live SDP testnet path end to end.

## Result

The hosted SDP deployment is healthy and the full verification flow now passes against `https://sdp-api.ayra.haus`.

## What Was Proved

- Hostinger project `ayra-sdp-testnet` is running.
- The DB container is healthy.
- The API, frontend, and TSS containers are up.
- The hosted API accepts the configured verifier API key after seeding it into the live SDP tenant DB.
- The hosted API accepts the correct asset UUID for the live USDC asset.
- The live receiver wallet must already have a USDC trustline for the E2E to settle.

## Root Cause Chain

1. `POST /disbursements` initially returned `401 Invalid API key`.
2. The live SDP DB did not contain the verifier API key from the local `.env`.
3. After seeding that key into the live tenant DB, the API auth failure disappeared.
4. The next failure was `400 asset ID could not be retrieved`.
5. The local verifier env had the wrong `STELLAR_SDP_ASSET_ID` for the hosted SDP instance.
6. After switching to the hosted USDC asset UUID, the verifier reached transaction submission.
7. The first live receiver wallet lacked a USDC trustline, causing Horizon `op_no_trust`.
8. After switching to the trustline-ready receiver wallet, the flow settled successfully.

## Live Values Confirmed

- Hosted USDC asset UUID: `1c486a48-afe9-4a15-9ee2-7c6ec5d59ccd`
- Trustline-ready receiver wallet: `GCE7267HRQDL7ZPCIAICAJWMJHQYOWZREVSMNBLO6GA7LKOPRJNV4CPC`
- Original receiver wallet without USDC trustline: `GCIRNZJOL3SHR6WOSRI4KL25IPDZPQP6LDPDDCDD2F5RABTQPOK6KBOO`

## Verification Evidence

Successful final verifier run:

- `ayraBatchCode`: `AYRA-SDP-SMOKE-20260521T084513Z`
- `sdpDisbursementId`: `319f134e-0028-4d35-b2f9-aaebeaf37887`
- `mappedSdpPaymentIds`: `["6a161ce0-13b0-47be-9267-88328574f696"]`
- `mappedTransactionIds`: `["9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6"]`
- `finalAyraStatusMapping`: `settled`

Payment readback:

- Payment `6a161ce0-13b0-47be-9267-88328574f696`
- Status: `SUCCESS`
- Transaction hash: `9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6`

Horizon transaction readback:

- Hash: `9b02f2db43af6a56907b92c1e74d95db1b243524b57430a5d1a579285d6c6ac6`
- `successful: true`
- Source account: `GCBCKNCXUCFCKSKL5JS4OSQNTH65TS3ZTPJLHQG3TAYTTQVH4445XQUA`

## Hostinger Actions Taken

- Inspected the live project inventory, container health, and logs for `ayra-sdp-testnet`.
- Seeded the verifier API key into the live SDP tenant DB using a temporary one-shot Hostinger project.
- Deleted the temporary seed project after the key was inserted.
- Confirmed the hosted API remained healthy after the verification run.

## Local Repo Updates

- Updated ignored local `.env` verifier values to match the hosted deployment:
  - `STELLAR_SDP_BASE_URL=https://sdp-api.ayra.haus`
  - `STELLAR_SDP_ASSET_ID=1c486a48-afe9-4a15-9ee2-7c6ec5d59ccd`
  - `STELLAR_SDP_TEST_RECEIVER_EMAIL=ayra-sdp-smoke-trustline@example.org`
  - `STELLAR_SDP_TEST_WALLET_ADDRESS=GCE7267HRQDL7ZPCIAICAJWMJHQYOWZREVSMNBLO6GA7LKOPRJNV4CPC`

## Remaining Caveat

The hosted SDP deployment is healthy, but the verifier will still fail if the chosen receiver wallet does not already trust the hosted USDC asset. That is a data/setup constraint, not a container health problem.

## Next Steps

1. Keep the hosted SDP API key in the live tenant DB or rotate it through the proper operator flow if you want to replace the temporary seeding approach.
2. Keep the verifier pinned to the hosted asset UUID and trustline-ready smoke wallet.
3. If you need a broader production closeout, wire the same hosted env values into the app-side secret store and re-run the browser flow against the deployed transparency app.
