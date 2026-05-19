export type ApplicationSubmitStatus = {
  tone: "ok" | "err";
  title: string;
  body: string;
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
