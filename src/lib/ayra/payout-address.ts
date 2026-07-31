const STELLAR_MEMO_TEXT_MAX_BYTES = 28;

export function normalizeWalletAddressMemo(value: string | null | undefined) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (new TextEncoder().encode(normalized).length > STELLAR_MEMO_TEXT_MAX_BYTES) {
    throw new Error("Stellar wallet memo must use at most 28 UTF-8 bytes.");
  }
  return normalized;
}
