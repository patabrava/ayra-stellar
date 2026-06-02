import { z } from "zod";

export const APPLICATION_FIELD_LIMITS = {
  applicantName: 2,
  proposedTrackName: 2,
  proposedInitiativeName: 2,
  scopeSummary: 20,
  operationalNotes: 10,
  milestonePlan: 4,
  contactSignal: 5,
} as const;

export const DEFAULT_APPLICATION_MILESTONES = [
  "Setup and address verification",
  "First field update",
  "Public proof review",
] as const;

export function normalizeMilestonePlan(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export const applicationSchema = z.object({
  applicantName: z.string().trim().min(APPLICATION_FIELD_LIMITS.applicantName),
  applicantEmail: z.string().trim().email(),
  proposedTrackName: z.string().trim().min(APPLICATION_FIELD_LIMITS.proposedTrackName),
  proposedInitiativeName: z
    .string()
    .trim()
    .min(APPLICATION_FIELD_LIMITS.proposedInitiativeName),
  scopeSummary: z.string().trim().min(APPLICATION_FIELD_LIMITS.scopeSummary),
  operationalNotes: z.string().trim().min(APPLICATION_FIELD_LIMITS.operationalNotes),
  milestonePlan: z
    .array(z.string().trim().min(APPLICATION_FIELD_LIMITS.milestonePlan))
    .min(1)
    .max(6),
  contactSignal: z.string().trim().min(APPLICATION_FIELD_LIMITS.contactSignal),
});
