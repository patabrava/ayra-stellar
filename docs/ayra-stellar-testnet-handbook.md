# AYRA Stellar Testnet Handbook

Purpose: manually verify the full customer journey on testnet, from public entry
through application, approval, stewardship, payout verification, batch
submission, settlement, and public proof.

This handbook is for human QA on the live testnet flow. It assumes the SDP test
stack is already available and the AYRA app is pointed at it.

## What You Are Testing

Test the real customer journey end to end:

1. Public visitor sees the Providencia wall.
2. Applicant submits a track/initiative application.
3. Admin approves the application and promotes access.
4. Steward signs in and submits a Stellar payout address.
5. Admin verifies the payout address.
6. Steward or admin publishes an update.
7. Admin creates a batch, submits it to SDP, and syncs status.
8. Public proof and project pages show the settled receipt.

The canonical public surface is `Providencia`. Use the seeded Providencia
surface unless the test explicitly asks you to create a synthetic track for
isolation.

## Before You Start

Confirm these are available:

- AYRA app on the live testnet environment.
- SDP API and dashboard reachable.
- A Stellar testnet wallet you control for the receiver address.
- An admin login for AYRA.
- A steward login for the scoped initiative.

Helpful links:

- Public wall: `https://transparency.ayra.haus`
- SDP API: `https://sdp-api.ayra.haus`
- SDP dashboard: `https://sdp-dashboard.ayra.haus`

If you are doing this locally instead of against the hosted instance, follow
`docs/ayra-stellar-sdp-testnet-runbook.md` first.

## Reusable Testnet Addresses

Use these public Stellar testnet addresses for the hosted manual flow.

Receiver address to paste in the steward payout form:

```text
GCE7267HRQDL7ZPCIAICAJWMJHQYOWZREVSMNBLO6GA7LKOPRJNV4CPC
```

Admin-side payment source / SDP distribution account:

```text
GDS3ALM67PFE5FZULUU52AZITTCS2PV642RNLNGO2UQHJRLIT3GKFKBD
```

Do not paste the distribution account into the steward payout form. The
distribution account is the funded source account controlled by the SDP
deployment. The receiver address is the test destination for disbursements.

Hosted testnet asset:

```text
USDC issuer: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

Funding status verified on Stellar testnet:

- Receiver: `9999.9999900 XLM` and `1.0000000 USDC`.
- Distribution: `9985.5462874 XLM` and `7.0000000 USDC`.
- Receiver funding transaction:
  `b838fecdac1dcf3d6cb3a7ebd6eed0da12cdef38f4e62f24bfe1a1d21b740f83`.

You can re-check balances with Horizon:

```bash
curl -fsS https://horizon-testnet.stellar.org/accounts/GCE7267HRQDL7ZPCIAICAJWMJHQYOWZREVSMNBLO6GA7LKOPRJNV4CPC
curl -fsS https://horizon-testnet.stellar.org/accounts/GDS3ALM67PFE5FZULUU52AZITTCS2PV642RNLNGO2UQHJRLIT3GKFKBD
```

## Journey Map

Use this order. Do not skip ahead unless you are only spot-checking a specific
step.

1. Public wall.
2. Apply.
3. Admin approval.
4. Steward portal.
5. Payout verification.
6. Batch creation.
7. SDP submission and sync.
8. Public proof.

## Step 1: Public Wall

Open the public wall.

Expected:

- The page opens on `Providencia` by default.
- The hero and project cards are visible.
- The `Apply` and `Login` buttons are present.
- No synthetic test track should be selected for the real smoke path.

Check:

- Track switcher shows `Providencia`.
- The lead project is `Reforestation`.
- Public copy stays on the public wall only, with no admin-only receipts.

## Step 2: Apply

Open `/apply`.

Fill the application form with a realistic test identity.

Recommended values:

- Applicant name: a test steward or operator name.
- Applicant email: a test inbox you can access.
- Track: `Providencia`.
- Initiative: a new initiative name if you want to test intake, or the seeded
  initiative if you want to test only access promotion.
- Scope: short description of the work.
- Operational details: milestones, contact model, and payout-readiness notes.
- Signal / phone: a test contact value.

Submit the form.

Expected:

- You receive a review confirmation.
- The application appears in the admin queue.
- No funding is approved yet.

## Step 3: Admin Approval

Open `/login` and sign in with the admin account.
Then open `/admin`.

In the `Applications` section:

- Find the submitted application.
- Click `Approve`.

Expected:

- The applicant is promoted into the correct scoped role(s).
- The application leaves the pending queue.
- The admin console still shows separate funding and payout controls.

## Step 4: Steward Portal

Open `/login` with the steward account created from the approved application.
Then open `/steward`.

Check:

- The portal is scoped to one initiative.
- The private email appears only in the internal section.
- Public contact and payout address panels are visible.

If the payout address is not yet present, submit one before continuing.

## Step 5: Payout Verification

In the steward portal:

1. Submit a Stellar testnet address you control.
2. Complete the required ownership proof if the flow asks for it.
3. Return to `/admin`.
4. Verify the payout address.

Expected:

- The address status becomes verified.
- The address is locked for the first disbursement.
- The admin queue clears the address item.

## Step 6: Update Publishing

In the steward portal:

1. Submit one field update with a caption and media.
2. Wait for moderation.
3. Approve it in the admin console.

Expected:

- The update enters moderation, not the public wall immediately.
- The admin console can approve, hold, edit-and-approve, or reject.
- The public wall shows only approved updates.

## Step 7: Batch Creation

In `/admin`, go to `Batches`.

Create one manual batch for the seeded Providencia initiative or the scoped
initiative under test.

Use a simple batch shape:

- One line item.
- One category.
- One local-currency snapshot.
- One private receipt file if you want to test admin-only receipt handling.

Expected:

- The batch appears as `ready`.
- Submitted line items are immutable once they leave draft state.
- The batch is blocked until the payout address is verified.

## Step 8: Submit and Sync SDP

Still in `/admin`:

1. Click `Submit` on the ready batch.
2. Wait for the batch to move into `submitted`.
3. Click `Sync status` until the batch settles.

Expected:

- SDP sync events are recorded server-side.
- A payment id is mapped to the canonical line item.
- A transaction hash appears once the payment settles.
- The batch becomes `settled`.

## Step 9: Public Proof

Open the public proof page for the settled batch.

Expected:

- The proof page loads without admin access.
- It shows category-level receipts only.
- It does not expose raw recipient names or private receipt files.
- The project page for the same initiative shows the settled batch in the
  receipts section.

## Pass Criteria

The test passes only if all of the following are true:

- The public wall still defaults to Providencia.
- Application intake works.
- Admin approval promotes the account correctly.
- Steward login works after promotion.
- Payout verification completes.
- A batch can be created and submitted.
- SDP sync reaches a settled transaction hash.
- Public proof pages show the settled receipt.

## Cleanup

After a test run, remove the test batch and any synthetic track or initiative
you created for isolation. Keep the canonical Providencia track if you used it
as the real smoke path.

Do not leave a synthetic batch live on the public wall.

## Notes

- Use `docs/ayra-stellar-sdp-testnet-runbook.md` for environment setup and SDP
  stack details.
- Use this handbook for the QA sequence itself.
- If you only need a quick smoke test, stop after Step 8 and verify the public
  proof page.
