import { z } from "zod";

// One explicit operator statement per transfer. The database function
// admin_record_batch_funding_classification() re-checks every field and records
// the signed-in admin as reviewer; nothing here is inferred from amount or hash.
export const fundingClassificationSchema = z
  .object({
    batchId: z.string().uuid(),
    initiativeId: z.string().uuid(),
    purpose: z.enum(["technical_validation", "approved_project_disbursement"]),
    sourceExternalId: z.string().trim().min(3).max(200),
    recipientGranteeId: z.string().uuid().optional(),
    evidenceReference: z.string().trim().min(8).max(500),
  })
  .refine(
    (value) =>
      value.purpose !== "approved_project_disbursement" || Boolean(value.recipientGranteeId),
    {
      path: ["recipientGranteeId"],
      message: "Approved project disbursements need the project's legal recipient.",
    },
  );

export type FundingClassificationInput = z.infer<typeof fundingClassificationSchema>;
