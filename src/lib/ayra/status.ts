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
          "AYRA has your application for review. An operator will review the track, initiative scope, and contact details before granting portal access.",
      };
    case "invalid":
      return {
        tone: "err",
        title: "Your application could not be submitted.",
        body:
          "Some required details were missing or invalid. Review the form, correct the fields, and submit it again.",
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
    case "signed-out":
      return {
        tone: "ok",
        title: "Signed out.",
        body:
          "Your session has ended. Use the email link form to sign back in whenever you are ready.",
      };
    case "sign-in-required":
      return {
        tone: "err",
        title: "Sign in is required.",
        body:
          "This page is protected. Request a new magic link to continue.",
      };
    case "scope-required":
      return {
        tone: "err",
        title: "Your account does not have steward access yet.",
        body:
          "The email matched, but the role records do not include steward or grantee access for this portal.",
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
