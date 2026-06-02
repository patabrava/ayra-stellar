# Handoff: Admin Batch Composer Initiative Anchor

## Task
Make the admin batch composer clearly show which initiative a batch belongs to before creation/submission.

## Why
The current composer lets operators edit `batch reference`, but the initiative target is hidden/hardcoded. That makes the form ambiguous and breaks operator confidence, especially when multiple initiatives exist.

## Best Answer
Do not add a destination-address field to the batch form. Keep payout selection server-owned. Instead, expose the initiative target in the composer itself and show the active verified payout destination for that initiative.

## Required Behavior
- Replace the hardcoded hidden initiative binding in the batch composer with a visible initiative selector or visible initiative block.
- Show the selected initiative name, track, code, steward, and active verified payout address directly in the composer.
- Keep `batch reference` editable, but make it clearly a label, not the target identifier.
- Preserve existing server-side destination resolution from the selected initiative.
- Keep create/submit flows fail-closed when the initiative has no verified payout address.

## Files
- `src/app/admin/page.tsx`
- `src/lib/ayra/actions.ts` only if form wiring needs cleanup

## Suggested Shape
- Prefer a single visible initiative selector in the batch composer.
- Add a compact destination summary below the selector.
- Keep the registry section below as reference data, not as the only place where initiative context exists.
- Avoid adding client complexity unless dynamic preview is necessary; a small client component is acceptable only if it materially improves clarity.

## Implementation Notes
- `createBatchAction()` already accepts `initiativeId` from the form.
- `submitBatchAction()` already resolves the payout destination from the initiative via the verified/locked payout-address lookup.
- The main fix is UI/IA, not payment logic.

## Acceptance Criteria
- The composer makes the target initiative obvious at first glance.
- The displayed payout preview changes when the selected initiative changes.
- Creating a batch still requires a verified payout address.
- Submitting a batch still uses the server-resolved destination for that initiative.
- The resulting batch row and proof path remain initiative-scoped.

## Validation
- Browser check `/admin` and confirm the composer shows initiative identity directly.
- Switch initiatives and verify the destination preview updates.
- Create a batch and confirm the batch row matches the selected initiative.
- Submit and sync the batch and confirm it follows the selected initiative’s payout address.

## Risks
- Multiple verified payout addresses for one initiative are still underspecified; the UI should make the active address visible, but the server currently chooses the first verified/locked match.
- Do not weaken the fail-closed payout requirement.
