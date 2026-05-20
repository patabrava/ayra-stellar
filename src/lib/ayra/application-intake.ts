import { z } from "zod";

export const APPLICATION_FIELD_LIMITS = {
  applicantName: 2,
  proposedTrackName: 2,
  proposedInitiativeName: 2,
  scopeSummary: 20,
  operationalNotes: 10,
  contactSignal: 5,
} as const;

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
  contactSignal: z.string().trim().min(APPLICATION_FIELD_LIMITS.contactSignal),
});
