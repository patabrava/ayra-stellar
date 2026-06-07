export function suggestBatchCode({
  initiativeCode,
  now = new Date(),
}: {
  initiativeCode: string;
  now?: Date;
}) {
  return `${batchCodePrefix(initiativeCode)}-${timestamp(now)}`;
}

function batchCodePrefix(initiativeCode: string) {
  const normalized = initiativeCode
    .trim()
    .toUpperCase()
    .replace(/^AYRA-PVD-/, "PV-")
    .replace(/^AYRA-/, "")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "AYRA-BATCH";
}

function timestamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
