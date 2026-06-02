# AYRA Stellar Live Testing Guide

Use this guide to test the live AYRA deployment end to end from the public wall through application intake, approval, stewardship, payout verification, batch creation, settlement, and public proof.

Live app:

- `https://transparency.ayra.haus`

## Who This Is For

This guide is for an external user or QA tester who wants to verify the live app manually.

You will need:

- A browser.
- Access to the live app.
- An admin account if you want to test approval and batch creation.
- A steward account if you want to test the scoped portal.
- A Stellar testnet wallet you control if you want to test payout-address submission.
- An email inbox if you are testing magic-link login.

## What You Should Test

The full journey is:

1. Public visitor sees the public wall.
2. Applicant submits a track and initiative application.
3. Admin approves the application.
4. Steward signs in and submits a payout address.
5. Admin verifies the payout address.
6. Steward submits an update.
7. Admin creates a batch.
8. Admin submits and syncs the batch.
9. Public proof page shows the settled result.

## Before You Start

Check these conditions first:

- The live site loads in your browser.
- You can sign in if you have credentials.
- Your wallet is ready if you plan to test payout verification.
- You know whether you are testing only the public flow or the full privileged flow.

If you only have public access, you can still test steps 1 and 2. The rest require admin or steward access.

## Step 1: Open the Public Wall

1. Open `https://transparency.ayra.haus`.
2. Confirm the page loads on the public wall.
3. Confirm the default track is `Providencia`.
4. Confirm you can see:
   - The track selector.
   - The public project entry points.
   - The `Apply` button.
   - The `Login` button.

What to look for:

- The public wall should feel like an overview, not a dashboard.
- The page should not show private contact information.
- The page should not show raw receipt file paths.

If this fails:

- Refresh once.
- Check your network connection.
- If the page still does not load, record the browser error and stop.

## Step 2: Open the Project Page

1. Click `Open Reforestation`.
2. Confirm you land on the project page for `Providencia / Reforestation`.
3. Confirm you can see public updates and a proof link.
4. Confirm the page does not expose:
   - Steward email addresses.
   - Private receipt files.
   - Internal reconciliation notes.

What to look for:

- The project page should explain the initiative clearly.
- The proof link should be visible if the batch is already settled.

## Step 3: Switch Tracks

1. Return to the public wall.
2. Switch to another track if one is available.
3. Switch back to `Providencia`.

What to look for:

- The selected track should visibly change.
- The page should still feel like the same product.
- The default public path should remain easy to recover.

## Step 4: Submit an Application

1. Open `/apply`.
2. Fill in the form with realistic test data.
3. Use a track such as `Providencia`.
4. Use a new initiative name if you want a clean test, or the seeded initiative if you only want to test access promotion.
5. Fill the scope and operational details with short, clear text.
6. Submit the form.

Recommended test data:

- Applicant name: a realistic person name.
- Email: an inbox you can access.
- Track: `Providencia`.
- Initiative: `Mangrove nursery` or another simple name.
- Scope: one sentence describing the work.
- Operational details: a few bullet-like sentences about cadence, contacts, and payout readiness.
- Signal / phone: a test contact value.

Expected result:

- You see a submitted confirmation.
- The application status updates on the page.
- The application is now waiting for admin review.

If this fails:

- Check that every required field is filled.
- Check that the email is valid.
- Re-submit once.

## Step 5: Sign In as Admin

1. Open `/login`.
2. Sign in with the admin account.
3. Complete the login flow.
4. Confirm that the app routes you to `/admin`.

Expected result:

- You land on the operator console.
- You can see applications, updates, batches, and proof pack sections.

If this fails:

- Make sure you used the admin account.
- If the app sends you somewhere unexpected, note the destination and stop.

## Step 6: Approve the Application

1. In `/admin`, open the `Applications` section.
2. Find the application you just submitted.
3. Click `Approve`.

Expected result:

- The application leaves the pending queue.
- The applicant is promoted into the correct scoped role or roles.
- The status indicates success.

What to confirm:

- The admin console still keeps funding and payout controls separate.
- Approval should not automatically create a payout batch.

## Step 7: Sign In as Steward

1. Open `/login` again.
2. Sign in with the steward account created or promoted from the approval flow.
3. Confirm that the app routes you to `/steward`.

Expected result:

- You land on the steward portal.
- The page is scoped to one initiative.
- You can see the private contact area and payout-address section.

What to look for:

- The steward page should be clearly different from the admin page.
- The scope should match the approved initiative.

## Step 8: Submit the First Payout Address

1. In `/steward`, locate the payout-address form.
2. Paste a Stellar testnet address that you control.
3. Submit the address.
4. If the flow asks for ownership proof, complete it exactly as instructed.
5. Return to `/admin`.
6. Find the payout-address item and verify it.

Expected result:

- The address moves from pending to verified.
- The verified address becomes the active payout destination for the initiative.
- The address is locked for the first disbursement.

Important:

- Use a wallet you control.
- Do not paste the distribution account into the steward form.

## Step 9: Submit an Update

1. In `/steward`, open the update form.
2. Enter a caption.
3. Add media only if you want to test upload handling.
4. Submit the update.
5. Return to `/admin`.
6. Approve or moderate the update.

Expected result:

- The update enters moderation first.
- The public wall shows the approved version only after moderation.

What to check:

- Private contact details do not appear on the public wall.
- Raw receipts stay out of the public surface.

## Step 10: Create a Batch

1. In `/admin`, go to the `Batches` section.
2. Find the `Create one-line batch` form.
3. Confirm which initiative the form is targeting.
4. Edit the batch reference if needed.
5. Set the period, category, and amounts.
6. Attach a private receipt only if you want to test admin-only receipt handling.
7. Click `Create ready batch`.

Expected result:

- The batch is created in `ready` status.
- The batch belongs to the initiative shown in the form.
- The batch is blocked if the initiative does not have a verified payout address.

What to check:

- The batch reference is just a label.
- The initiative target should be visible in the composer.
- The payout destination should be clear enough that you know which initiative will be funded.

## Step 11: Submit the Batch

1. In `/admin`, find the new ready batch row.
2. Click `Submit`.

Expected result:

- The batch moves from `ready` to `submitted`.
- The app maps the batch to the initiative’s verified payout destination.
- The batch receives an SDP or payment reference.

If this fails:

- Check that the payout address is verified.
- Check that the batch belongs to the expected initiative.
- Check that the admin session is still active.

## Step 12: Sync the Batch

1. Still in `/admin`, click `Sync status`.
2. Repeat until the batch becomes settled.

Expected result:

- A transaction hash appears.
- The line item status becomes settled.
- The batch status becomes settled.

What to look for:

- The proof should represent a real settled payment, not just a draft.
- The app should continue to hide private receipt paths from public surfaces.

## Step 13: Open the Public Proof Page

1. Open the proof page for the settled batch.
2. If the app gives you a proof link, click it.
3. Confirm the page loads without admin access.

Expected result:

- You see a public proof pack.
- You see category-level receipts.
- You see a payment proof hash.
- You do not see private recipient data or raw receipt file paths.

Also confirm:

- The project page shows the settled batch in the receipts section.
- The proof page still looks public, not operator-only.

## Pass Criteria

The test passes if all of these are true:

- The public wall defaults to `Providencia`.
- The application form can be submitted.
- Admin approval works.
- Steward login works after approval.
- Payout-address submission and verification work.
- Batch creation works.
- Batch submission and sync work.
- The proof page shows the settled result.

## Suggested Short Smoke Test

If you only have time for the fastest meaningful check, do this:

1. Open the public wall.
2. Open `/apply` and submit an application.
3. Sign in as admin and approve it.
4. Sign in as steward and submit a payout address.
5. Return to admin, verify the address, create a batch, submit it, and sync it.
6. Open the proof page and confirm the settled receipt is public.

## Cleanup

After a test run, remove any synthetic data you created if you used a test-only track or initiative.

Do not leave temporary test batches around if they are not supposed to remain public.

## Notes

- If you only have public access, stop after the public wall and application steps.
- If you have admin access only, you can still verify approval and batch behavior.
- If you have steward access only, you can verify the scoped portal and payout submission.
- The most important check is that public pages never expose private receipt paths or private contact data.
