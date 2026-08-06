# Partner Logo Rail Design

## Goal

Add a familiar, understated partner-logo treatment to the public AYRA landing page without introducing promotional copy or competing with the Apply CTA.

## Placement

Render a compact logo rail after the Projects section and its living-public-record note, immediately before the site footer. This follows the approved closing-credits placement while keeping the page ending conventional.

## Content

Show exactly three partner marks:

- Stellar Development Foundation
- Climate Future e.V.
- Sparkclub

There is no visible heading, label, description, partnership category, or claim. The section receives an accessible name for screen readers, and each image has accurate alternative text.

## Visual Treatment

- Separate the rail from the page with one thin top rule.
- Use a centered three-column layout with generous spacing and compact vertical padding.
- Normalize the marks by optical height rather than forcing identical widths.
- Use official light-on-dark assets without recoloring or redrawing the brands.
- Preserve the existing Sparkclub SVG from the AYRA landing project.
- Keep the rail visually subordinate to the hero, projects, and Apply CTA.

## Responsive Behavior

On narrow screens, stack the three marks vertically with consistent spacing and no horizontal scrolling or clipping.

## Interaction

The marks are informational and are not links. No hover animation, tooltip, or secondary CTA is added.

## Asset Sources

- Stellar Development Foundation: official Stellar brand resources.
- Climate Future e.V.: the organization’s official website asset.
- Sparkclub: the existing `sparkclub-logo.svg` from the AYRA landing project.

## Verification

- Add a regression test asserting that all three marks and the logo rail render.
- Assert that the rail has no visible partner heading or CTA.
- Run the targeted public-dashboard test and lint.
- Verify the local landing page responds and visually inspect desktop and mobile layouts.
