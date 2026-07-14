export type ApplicationSubmitStatus = {
  tone: "ok" | "err";
  title: string;
  body: string;
};

export type LoginStatus = {
  tone: "ok" | "err";
  title: string;
  body: string;
};

export type JourneySurface = "admin" | "steward";

export type JourneyStatus = {
  tone: "ok" | "warn" | "err" | "info";
  label: string;
  title: string;
  body: string;
  details?: string[];
};

type AuthErrorShape = {
  status?: number;
  code?: string;
  message?: string;
};

export function getApplicationSubmitStatus(
  status?: string,
): ApplicationSubmitStatus | null {
  switch (status) {
    case "submitted":
    case "demo-submitted":
      return {
        tone: "ok",
        title: "Your application has been submitted.",
        body:
          "AYRA has your application for review. An operator will review the track, initiative scope, and contact details before granting portal access. If approved, the steward portal will ask for the first Stellar payout address before any payment can be created.",
      };
    case "invalid":
      return {
        tone: "err",
        title: "Your application could not be submitted.",
        body:
          "Some required details were missing or too short. Check the email, use at least two characters for names, twenty for scope, ten for operational details, and five for Signal or phone.",
      };
    case "error":
      return {
        tone: "err",
        title: "Your application could not be submitted.",
        body:
          "The submission failed before AYRA could queue it for review. Please try again in a moment.",
      };
    default:
      return null;
  }
}

export function getJourneyStatus(
  surface: JourneySurface,
  status?: string,
): JourneyStatus | null {
  const normalized = normalizeJourneyStatus(status);

  if (normalized === "signed-in") {
    return {
      tone: "ok",
      label: "Signed in",
      title: "You are signed in.",
      body:
        surface === "admin"
          ? "Your operator session is active. You can review applications, submissions, payout addresses, and payment actions from this console."
          : "Your portal session is active. You can submit updates and manage the payout-address verification step for your scoped initiative.",
    };
  }

  if (surface === "steward") {
    switch (normalized) {
      case "payout-submitted":
        return {
          tone: "warn",
          label: "Pending review",
          title: "Your Stellar payout address is pending AYRA verification.",
          body:
            "AYRA now has the address you submitted. You can keep working on updates while the address is verified and locked for the first disbursement.",
        };
      case "payout-submitted-ready":
        return {
          tone: "ok",
          label: "USDC ready",
          title: "Your payout address is saved and ready for USDC review.",
          body:
            "AYRA saved the address and Horizon already shows the expected USDC trustline. The remaining step is AYRA verification and lock for the first disbursement.",
        };
      case "payout-submitted-trustline-missing":
        return {
          tone: "warn",
          label: "Trustline missing",
          title: "Your payout address is saved, but it cannot receive USDC yet.",
          body:
            "AYRA saved the address, but Horizon does not show the expected USDC trustline on the configured Stellar network yet. Open the wallet that controls this address, add that USDC trustline, and then resubmit the address or ask AYRA to recheck it.",
        };
      case "update-submitted":
        return {
          tone: "ok",
          label: "Update sent",
          title: "Your update is in the moderation queue.",
          body:
            "AYRA will review the caption and media before anything reaches the public wall.",
        };
      case "milestone-submitted":
        return {
          tone: "ok",
          label: "Evidence sent",
          title: "Your private milestone package is under review.",
          body:
            "AYRA can now review the evidence package for this milestone. It is not published on the public project page.",
        };
      case "milestone-upload-error":
        return {
          tone: "err",
          label: "Upload failed",
          title: "AYRA could not attach the private evidence.",
          body:
            "Check the file, then submit the private milestone package again.",
        };
      case "media-error":
        return {
          tone: "err",
          label: "Upload failed",
          title: "AYRA could not attach the media.",
          body:
            "Check the file or URL, then submit the update again. The rest of the draft is still safe to resend.",
        };
      case "media-too-large":
        return {
          tone: "err",
          label: "Upload too large",
          title: "That media file is too large.",
          body:
            "Use an image or clip under 4 MB, then submit the update again. The rest of the draft is still safe to resend.",
        };
      case "scope-denied":
        return {
          tone: "err",
          label: "Access mismatch",
          title: "This initiative is outside your scoped access.",
          body:
            "Sign in with the approved account for this initiative, or ask AYRA to update the role record.",
        };
      case "invalid":
        return {
          tone: "err",
          label: "Needs attention",
          title: "Some steward fields need another pass.",
          body:
            "Stellar payout addresses start with G. Do not paste an S-prefixed secret seed or private key; use the public account address you want AYRA to verify.",
        };
      case "error":
        return {
          tone: "err",
          label: "Save failed",
          title: "AYRA could not save that steward change.",
          body:
            "Try again in a moment. If it keeps failing, the operator console needs a check.",
        };
      default:
        return null;
    }
  }

  switch (normalized) {
    case "application-approved":
      return {
        tone: "ok",
        label: "Access granted",
        title: "Application approved.",
        body:
          "The applicant now has steward portal access. AYRA created the project records needed for their scoped workspace.",
        details: [
          "Steward access is active for the approved applicant account.",
          "Next step: the steward submits the first Stellar payout address in the steward portal.",
          "No funding payment can be created until that address is verified and locked.",
        ],
      };
    case "application-rejected":
      return {
        tone: "warn",
        label: "Application rejected",
        title: "Application rejected.",
        body:
          "The proposal stays out of the active registry and no steward or grantee-contact access was granted.",
      };
    case "duplicate-batch-code":
      return {
        tone: "err",
        label: "Duplicate code",
        title: "That payment reference already exists.",
        body:
          "Use the suggested timestamped reference or enter a unique payment label before saving again.",
      };
    case "payout-verified":
      return {
        tone: "ok",
        label: "Ready to fund",
        title: "Payout address verified.",
        body:
          "The address is now locked. You can create a payment for this initiative once the line items are ready.",
      };
    case "update-moderated":
      return {
        tone: "ok",
        label: "Published",
        title: "Update moderated.",
        body:
          "The public version is ready on the wall. Review it or move on to the next submission.",
      };
    case "batch-created":
      return {
        tone: "info",
        label: "Payment draft",
        title: "Payment draft created.",
        body:
          "Add the line items you want to pay, then submit once the verified payout address is in place.",
      };
    case "advance-created":
      return {
        tone: "info",
        label: "Advance payment",
        title: "Advance payment draft created.",
        body:
          "This payment is an admin-approved exception and is not linked to a steward milestone package.",
      };
    case "milestone-required":
      return {
        tone: "err",
        label: "Evidence required",
        title: "Select an approved milestone package.",
        body:
          "Normal payments need one approved private milestone submission from the same initiative before they can be created.",
      };
    case "milestone-unavailable":
      return {
        tone: "err",
        label: "Evidence unavailable",
        title: "That milestone package cannot back this payment.",
        body:
          "Choose an approved, unused milestone submission from the same initiative, or mark the payment as an advance.",
      };
    case "milestone-reviewed":
      return {
        tone: "ok",
        label: "Evidence reviewed",
        title: "Milestone package review saved.",
        body:
          "The payment form now reflects the latest approved or rejected milestone evidence.",
      };
    case "batch-submitted":
      return {
        tone: "info",
        label: "In flight",
        title: "Payment sent to Stellar SDP.",
        body:
          "AYRA is waiting on payment status sync and transaction hashes. The proof pack will update as settlement lands.",
      };
    case "batch-synced":
      return {
        tone: "ok",
        label: "Synced",
        title: "Payment status synced.",
        body:
          "Payment states and hashes are refreshed across the proof pack and registry.",
      };
    case "attribution-resolved":
      return {
        tone: "ok",
        label: "Attribution matched",
        title: "The attribution exception is resolved.",
        body:
          "The source record and local attribution now resolve for this line item. The public export will show the matched state without exposing operator notes or private receipts.",
      };
    case "proof-release-created":
      return {
        tone: "ok",
        label: "Release frozen",
        title: "The versioned proof release is immutable.",
        body:
          "AYRA stored the normalized public proof payload with its SHA-256 digest, application commit, deployment identity, and Stellar network.",
      };
    case "proof-release-ineligible":
      return {
        tone: "err",
        label: "Release blocked",
        title: "This proof pack is not ready to freeze.",
        body:
          "The batch must be settled and every receipt must have verified USDC metadata plus matched attribution before a versioned release can be created.",
      };
    case "mainnet-disabled":
      return {
        tone: "warn",
        label: "Mainnet paused",
        title: "Mainnet payment submission is disabled.",
        body:
          "Fund the isolated mainnet distribution account, verify a pubnet recipient and Circle USDC trustline, then enable the release switch before submitting.",
      };
    case "payout-required":
      return {
        tone: "warn",
        label: "Blocked",
        title: "Verify a payout address first.",
        body:
          "This initiative needs one verified Stellar address before a payment can be created or submitted.",
      };
    case "payout-trustline-required":
      return {
        tone: "err",
        label: "Trustline required",
        title: "The payout address cannot receive USDC yet.",
        body:
          "Ask the receiver to add the USDC trustline for AYRA's configured Stellar network and issuer, then submit the payment again. AYRA blocked the SDP send before creating another failed transaction.",
      };
    case "promotion-error":
      return {
        tone: "err",
        label: "Promotion failed",
        title: "Application approval stopped during role promotion.",
        body:
          "The application status changed, but one or more role records did not save. Check the profile and roles, then retry.",
      };
    case "line-item-error":
      return {
        tone: "err",
        label: "Line item issue",
        title: "A payment line item needs attention.",
        body:
          "Check the payment items and payout address, then try again.",
      };
    case "allocation-error":
      return {
        tone: "err",
        label: "Allocation issue",
        title: "The allocation could not be saved.",
        body:
          "Check the initiative, payment, and amount values, then retry.",
      };
    case "exchange-rate-error":
      return {
        tone: "err",
        label: "Rate unavailable",
        title: "AYRA could not load the daily USD/COP rate.",
        body:
          "The one-line payment was not saved. Refresh the admin console and retry once the market-rate source is reachable.",
      };
    case "receipt-error":
      return {
        tone: "err",
        label: "Missing receipt",
        title: "A private receipt is missing.",
        body:
          "Attach the receipt in admin reconciliation before saving again.",
      };
    case "reconciliation-error":
      return {
        tone: "err",
        label: "Reconciliation issue",
        title: "Reconciliation could not be saved.",
        body:
          "Check the receipt path and try again.",
      };
    case "sdp-error":
      return {
        tone: "err",
        label: "SDP error",
        title: "The Stellar SDP step failed.",
        body:
          "AYRA could not reach the payment provider. Check the gateway configuration and retry.",
      };
    case "invalid":
      return {
        tone: "err",
        label: "Needs attention",
        title: "Some admin fields need another pass.",
        body:
          "Check the required IDs and values before retrying.",
      };
    case "error":
      return {
        tone: "err",
        label: "Save failed",
        title: "AYRA could not save that admin change.",
        body:
          "Try again in a moment. If it keeps failing, review the server logs or Supabase records.",
      };
    default:
      return null;
  }
}

export function getLoginStatus(status?: string): LoginStatus | null {
  switch (status) {
    case "link-sent":
    case "demo-link-sent":
      return {
        tone: "ok",
        title: "Magic link sent.",
        body:
          "Check your inbox for the sign-in email. If it does not arrive within a minute, you can resend the link from this screen.",
      };
    case "link-error":
      return {
        tone: "err",
        title: "We could not send the magic link.",
        body:
          "The email step failed before Supabase finished the request. Check the address, then try again.",
      };
    case "link-rate-limited":
      return {
        tone: "err",
        title: "Magic-link email limit reached.",
        body:
          "Supabase accepted this admin account, but the built-in mailer has temporarily blocked more emails to this address. Wait before requesting another link, or configure custom SMTP for production auth email.",
      };
    case "sign-in-required":
      return {
        tone: "err",
        title: "Sign in is required.",
        body:
          "This page is protected. Request a new magic link to continue.",
      };
    case "supabase-not-configured":
      return {
        tone: "err",
        title: "Supabase auth is not configured.",
        body:
          "This runtime is missing the public Supabase URL or anon key. Add the environment values, then restart the app before trying to sign in.",
      };
    case "scope-required":
      return {
        tone: "err",
        title: "Apply to a track before steward access.",
        body:
          "This account is signed in, but it is not connected to an approved AYRA track application or steward/grantee role yet. Submit an application first, or use the approved account for your track.",
      };
    case "application-required":
      return {
        tone: "err",
        title: "Apply first, or use an admin account.",
        body:
          "This email is not connected to an approved AYRA application or operator role. Submit an application first, or sign in with the approved admin email.",
      };
    case "admin-required":
      return {
        tone: "err",
        title: "Admin access is required.",
        body:
          "The email matched, but the role records do not include the admin permission needed for this page.",
      };
    case "auth-error":
      return {
        tone: "err",
        title: "We could not complete sign-in.",
        body:
          "The callback token was rejected or expired. Request a fresh magic link and try again.",
      };
    case "google-provider-unavailable":
      return {
        tone: "err",
        title: "Google sign-in is not ready yet.",
        body:
          "The Google provider did not return a sign-in URL. Check that the Supabase Google provider has a valid Google Web client ID and secret.",
      };
    default:
      return null;
  }
}

export function loginStatusForAuthError(error: unknown) {
  const authError = error as AuthErrorShape | null;
  const code = authError?.code ?? "";
  const message = authError?.message ?? "";

  if (
    authError?.status === 429 ||
    code === "over_email_send_rate_limit" ||
    /rate limit/i.test(message)
  ) {
    return "link-rate-limited";
  }

  return "link-error";
}

function normalizeJourneyStatus(status?: string) {
  if (!status) return undefined;
  return status.startsWith("demo-") ? status.slice(5) : status;
}
