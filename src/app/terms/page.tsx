import type { ReactNode } from "react";

import { PublicNav } from "@/components/ayra/public-nav";
import { LEGAL_NOTICE } from "@/lib/ayra/legal";

export const metadata = {
  title: "Terms & Conditions | AYRA Stellar",
  description: "Website terms and conditions for the AYRA transparency platform.",
};

function TermsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-[var(--dark-rule)] py-8 md:grid md:grid-cols-[14rem_1fr] md:gap-10">
      <h2 className="display text-xl font-medium text-[var(--public-fg)] md:text-2xl">
        {title}
      </h2>
      <div className="public-muted mt-4 space-y-4 text-base leading-7 md:mt-0">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <main className="public-shell flex-1">
      <PublicNav
        ariaLabel="Terms and Conditions page"
        groups={[
          {
            label: "Navigation",
            items: [{ href: "/", label: "Back to home" }],
          },
        ]}
        homeHref="/"
      />

      <section className="px-[var(--pad-page)] py-14 md:py-20">
        <div className="max-w-4xl">
          <div className="place-line">Legal · AYRA Stellar</div>
          <h1 className="hero-title mt-7 max-w-3xl text-5xl md:text-6xl">
            Terms &amp; Conditions.
          </h1>
          <p className="public-muted mt-6 text-sm">
            Last updated: <time dateTime="2026-09-01">1 September 2026</time>
          </p>

          <div className="mt-12">
            <TermsSection title="1. Operator and scope">
              <p>
                This website is operated by {LEGAL_NOTICE.organization},{" "}
                {LEGAL_NOTICE.address}.
              </p>
              <p>
                These Terms &amp; Conditions describe the conditions for using the
                AYRA website and its public transparency, application, and
                account-access features. Separate written agreements concerning
                initiatives, funding, grants, services, employment, or payments
                take precedence over these terms.
              </p>
            </TermsSection>

            <TermsSection title="2. Purpose of the website">
              <p>
                AYRA provides information about initiatives, public updates,
                funding records, and supporting proof. Website content is
                provided for transparency and general information.
              </p>
              <p>
                Publication of an initiative, application, update, projection,
                or funding record does not by itself constitute an offer, funding
                commitment, investment recommendation, guarantee, or contractual
                promise.
              </p>
            </TermsSection>

            <TermsSection title="3. Acceptable use">
              <p>You may use the website only for lawful purposes. You must not:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-[var(--public-dim)]">
                <li>
                  attempt to gain unauthorized access to accounts, systems, or
                  private records;
                </li>
                <li>interfere with the website&apos;s availability or security;</li>
                <li>submit malicious code or intentionally misleading information;</li>
                <li>
                  use automated access in a way that places an unreasonable load
                  on the service;
                </li>
                <li>
                  misuse published information to impersonate, harass, or
                  unlawfully harm another person.
                </li>
              </ul>
            </TermsSection>

            <TermsSection title="4. Applications and submitted material">
              <p>
                Information submitted through an AYRA form should be accurate and
                submitted only by someone authorized to provide it.
              </p>
              <p>
                The notices shown in the relevant form—and any separate
                agreement—govern the review, storage, and publication of submitted
                text, photographs, and supporting material. Submission does not
                guarantee approval, publication, funding, portal access, or
                payment.
              </p>
            </TermsSection>

            <TermsSection title="5. Accounts and access">
              <p>
                Account links and authenticated access are personal to the
                authorized user. Users must not share access credentials or
                attempt to access records outside their assigned role.
              </p>
              <p>
                AYRA may restrict access when reasonably necessary to protect
                users, private information, platform security, or the integrity
                of public records.
              </p>
            </TermsSection>

            <TermsSection title="6. External services and public records">
              <p>
                The website may link to third-party services, including public
                blockchain explorers. Third-party services are governed by their
                own terms and availability.
              </p>
              <p>
                Blockchain transactions and public proofs may remain publicly
                accessible independently of AYRA. AYRA does not control
                third-party networks or guarantee their uninterrupted
                availability.
              </p>
            </TermsSection>

            <TermsSection title="7. Availability and liability">
              <p>
                AYRA takes reasonable care to keep published information accurate
                and the website available. Continuous, uninterrupted, or
                error-free operation is not guaranteed.
              </p>
              <p>
                Liability remains unlimited for intent and gross negligence,
                injury to life, body, or health, guarantees expressly given, and
                liability required by law. For slight negligence involving an
                essential contractual obligation, liability is limited to the
                foreseeable damage typical for that kind of obligation.
                Otherwise, liability for slight negligence is excluded to the
                extent permitted by law.
              </p>
            </TermsSection>

            <TermsSection title="8. Changes">
              <p>
                AYRA may update these terms when the website, its services, or
                applicable requirements change. The current version and its
                effective date will be published on this page.
              </p>
              <p>
                Changes do not retroactively alter separate agreements already
                concluded.
              </p>
            </TermsSection>

            <TermsSection title="9. Applicable law">
              <p>
                German law applies to the extent permitted by law. Mandatory consumer-protection rules applicable in a user&apos;s country of
                residence remain unaffected.
              </p>
            </TermsSection>

            <TermsSection title="10. Contact">
              <p>
                Questions about these terms can be sent to{" "}
                <a
                  className="text-[var(--public-fg)] underline underline-offset-4 transition hover:text-[var(--public-muted)]"
                  href={`mailto:${LEGAL_NOTICE.email}`}
                >
                  {LEGAL_NOTICE.email}
                </a>
                .
              </p>
            </TermsSection>
          </div>
        </div>
      </section>
    </main>
  );
}
