# AYRA Website Terms & Conditions Design

## Goal

Add narrow website-use terms for the AYRA transparency platform and make them available through the global footer without implying that generic website terms govern grants, funding, payouts, employment, or other separate agreements.

## Chosen approach

Create a dedicated `/terms` page using the same editorial legal-page treatment as `/impressum`. Add a `Terms` link to the global footer between `Impressum` and the existing contact email.

The page is an English website-use template for CREADOR LABS UG (haftungsbeschränkt). It covers informational use, acceptable use, applications and submitted material, authenticated access, external services and public blockchain records, availability and liability, changes, applicable law, and contact.

## Approved page copy

# Terms & Conditions

Last updated: 1 September 2026

## 1. Operator and scope

This website is operated by CREADOR LABS UG (haftungsbeschränkt), Heideweg 3, 76149 Karlsruhe, Germany.

These Terms & Conditions describe the conditions for using the AYRA website and its public transparency, application, and account-access features. Separate written agreements concerning initiatives, funding, grants, services, employment, or payments take precedence over these terms.

## 2. Purpose of the website

AYRA provides information about initiatives, public updates, funding records, and supporting proof. Website content is provided for transparency and general information.

Publication of an initiative, application, update, projection, or funding record does not by itself constitute an offer, funding commitment, investment recommendation, guarantee, or contractual promise.

## 3. Acceptable use

You may use the website only for lawful purposes. You must not:

- attempt to gain unauthorized access to accounts, systems, or private records;
- interfere with the website's availability or security;
- submit malicious code or intentionally misleading information;
- use automated access in a way that places an unreasonable load on the service;
- misuse published information to impersonate, harass, or unlawfully harm another person.

## 4. Applications and submitted material

Information submitted through an AYRA form should be accurate and submitted only by someone authorized to provide it.

The notices shown in the relevant form—and any separate agreement—govern the review, storage, and publication of submitted text, photographs, and supporting material. Submission does not guarantee approval, publication, funding, portal access, or payment.

## 5. Accounts and access

Account links and authenticated access are personal to the authorized user. Users must not share access credentials or attempt to access records outside their assigned role.

AYRA may restrict access when reasonably necessary to protect users, private information, platform security, or the integrity of public records.

## 6. External services and public records

The website may link to third-party services, including public blockchain explorers. Third-party services are governed by their own terms and availability.

Blockchain transactions and public proofs may remain publicly accessible independently of AYRA. AYRA does not control third-party networks or guarantee their uninterrupted availability.

## 7. Availability and liability

AYRA takes reasonable care to keep published information accurate and the website available. Continuous, uninterrupted, or error-free operation is not guaranteed.

Liability remains unlimited for intent and gross negligence, injury to life, body, or health, guarantees expressly given, and liability required by law. For slight negligence involving an essential contractual obligation, liability is limited to the foreseeable damage typical for that kind of obligation. Otherwise, liability for slight negligence is excluded to the extent permitted by law.

## 8. Changes

AYRA may update these terms when the website, its services, or applicable requirements change. The current version and its effective date will be published on this page.

Changes do not retroactively alter separate agreements already concluded.

## 9. Applicable law

German law applies to the extent permitted by law. Mandatory consumer-protection rules applicable in a user's country of residence remain unaffected.

## 10. Contact

Questions about these terms can be sent to sozial@ayra.haus.

## Interface and accessibility

- The footer order is `Privacy`, `Impressum`, `Terms`, then the existing public contact email.
- `/terms` uses `PublicNav`, a home link, the existing public typography and colors, semantic headings, a semantic list for acceptable use, and a clickable `mailto:sozial@ayra.haus` link.
- The page remains readable without horizontal overflow on desktop and mobile.
- The page contains no checkbox or assertion that merely visiting the site creates a broader commercial agreement.

## Verification and release

- Add regression coverage for the footer link, route, update date, all ten headings, company identity, precedence statement, liability boundaries, consumer-protection reservation, and contact link.
- Run the focused test, full test suite, lint, and production build.
- Verify homepage-to-Terms navigation, exact content, one global footer, keyboard/mobile navigation, overflow, and console health in a real browser.
- Commit only intended files, push `main`, deploy the linked `ayra-transparency` Vercel project, and verify the custom production domain.
