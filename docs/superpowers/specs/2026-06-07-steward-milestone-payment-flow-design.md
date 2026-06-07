# Steward Milestone + Payment Flow Design

## Goal
Split public progress updates from private payment evidence.

Stewards need one flow for public communication and a separate private flow for supporting evidence. Normal payments must be linked to exactly one approved private milestone submission. Advance payments remain possible, but they bypass the milestone link and are approved directly by admins in the operator UI.

## Problem
The current flow mixes concepts:
- public updates are for narrative progress
- private documents are for payment justification
- payment approval sometimes needs supporting proof
- some payments are advances and cannot wait for a milestone package

One form cannot cover all of this cleanly without confusing stewards and admins.

## Proposed Shape
Use two steward-facing actions and one admin payment action:

1. Public update
- short public progress post
- optional media
- visible on the public project page

2. Private milestone submission
- private, initiative-scoped evidence package
- contains documents/proof that support a milestone
- not public
- reviewed by admins

3. Payment creation/approval
- normal payment: must link to one approved milestone submission
- advance payment: may be approved without a milestone link
- admin approves advances from the admin UI

## Data Model
Add a private steward submission entity, tentatively `milestone_submissions`.

Suggested fields:
- `id`
- `initiative_id`
- `milestone_id`
- `submitted_by_profile_id`
- `status` with values `draft`, `submitted`, `approved`, `rejected`
- `title`
- `summary`
- `private_document_path` or equivalent attachment reference
- timestamps

Add a payment attribute, tentatively `payment_kind`:
- `normal`
- `advance`

Add a payment-to-submission link:
- normal payments must reference exactly one approved milestone submission
- one milestone submission can be linked to only one payment
- the link must be enforced at the data layer, not just in the UI

## Workflow
### Steward path
1. Steward writes a public update if they want to share progress.
2. Steward separately submits a private milestone package with docs/proof.
3. Admin reviews the package.

### Admin path for normal payments
1. Admin creates a normal payment.
2. The form requires a dropdown of approved milestone submissions for the same initiative.
3. The admin chooses one submission.
4. The payment cannot be saved without that link.

### Admin path for advance payments
1. Admin marks the payment as `advance`.
2. The milestone dropdown is hidden or disabled.
3. The payment can be approved directly from the admin UI.

## UI Requirements
### Steward UI
- Keep public updates and private milestone submissions separate.
- Make the private submission feel operational and evidence-focused, not public-facing.
- Do not mix private docs into the public update composer.

### Admin UI
- Payment form shows a `Payment type` control.
- If `normal`, show a required milestone-submission dropdown.
- If `advance`, show the admin approval action instead.
- The dropdown only lists approved submissions for the selected initiative.
- The dropdown should display enough context to disambiguate submissions, such as milestone name, submitted date, and short title.

## Rules
- Public updates never satisfy the evidence requirement for normal payments.
- A normal payment without a linked approved milestone submission is invalid.
- A milestone submission cannot be reused for more than one payment.
- Advance payments are admin-approved exceptions and do not require a steward milestone package.
- The evidence boundary remains private; public proof pages still show only verified payment metadata and receipts, not private documents.

## Error Handling
- If no approved milestone submissions exist, the normal payment flow should explain why the dropdown is empty.
- If a linked submission is later rejected or removed, the payment should become invalid or require admin repair.
- If an advance payment is attempted without the proper admin action, the UI should block it with a clear status message.

## Acceptance Criteria
- Steward can submit a public update without attaching private docs.
- Steward can submit a private milestone package separately.
- Admin can create a normal payment only by linking one approved milestone submission.
- Admin can create an advance payment without a milestone link.
- A single milestone submission cannot back multiple payments.
- Public proof pages remain unchanged except for any new payment metadata needed for traceability.

## Scope Boundary
This design intentionally does not:
- merge private docs into public updates
- make milestone submission mandatory for all payments
- change the public proof model into a private-doc viewer
- introduce a new approval queue unrelated to payments or milestone evidence

## Implementation Surfaces
Likely changes will touch:
- steward update and submission UI
- admin payment form and approval actions
- payment storage and submission validation
- private submission storage and review state
- tests for the normal-payment and advance-payment branches

