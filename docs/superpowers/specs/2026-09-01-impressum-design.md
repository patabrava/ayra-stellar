# AYRA Impressum Design

## Goal

Make CREADOR LABS UG (haftungsbeschränkt) visibly accountable as the company responsible for the AYRA site, using the familiar German website pattern.

## Chosen approach

Add one dedicated `/impressum` page containing the complete legal notice. Add an `Impressum` link to the shared site footer and render that footer from the root layout so the link is available on every application page, including public, login, steward, and admin routes.

This is preferable to repeating the full company record in every footer: the ownership link remains consistently visible while the complete legal information has one authoritative source that cannot drift between pages.

## Page content

The Impressum page will display exactly:

- CREADOR LABS UG (haftungsbeschränkt)
- Heideweg 3, 76149 Karlsruhe, Germany
- Registergericht: Amtsgericht Mannheim · HRB 748597
- Geschäftsführer: Nicolas Samuel Weber, Camilo Andrés Echeverri Mahecha
- USt-IdNr.: DE365784924
- Kontakt: sozial@ayra.haus, presented as an email link

The page will use the existing public navigation, typography, spacing, colors, and footer styles. It will include page metadata and a home link. No additional legal claims or generated boilerplate will be introduced.

## Site-wide behavior

- The root layout owns the shared footer.
- Existing page-local footer instances are removed to prevent duplicates.
- `Privacy` and `Impressum` remain visible as distinct footer links.
- The current contact email and social links remain unchanged.
- The footer remains responsive and keyboard accessible.

## Verification

- Add regression coverage for the exact company details, `/impressum` route, and global footer placement.
- Run the focused tests, full test suite, lint, and production build.
- Exercise the deployed homepage and `/impressum` in a real browser at desktop and mobile widths, confirm navigation and email-link behavior, check for duplicate footers or horizontal overflow, and verify console health.
- Commit only the intended files, push `main`, deploy the `ayra-transparency` Vercel project, and verify `https://transparency.ayra.haus/impressum` returns and renders the new production page.
