// Phone number normalisation for kidvo.
//
// Accepts the formats Romanian users actually type:
//   0745369041
//   0745 369 041
//   0745-369-041
//   +40 745 369 041
//   +40745369041
//   40745369041            (no plus, e.g. pasted from WhatsApp)
//   0040745369041          (international 00 prefix)
//
// Always returns the canonical form `+40XXXXXXXXX` (12 chars), or null when
// the input doesn't match any supported shape. Leading 0 followed by 9 digits
// covers landlines (02xx, 03xx) and mobiles (07xx) — that's enough for our use.

const CANONICAL = /^\+40\d{9}$/

export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null
  const cleaned = input.replace(/[\s\-().]/g, '')
  if (!cleaned) return null

  if (/^0\d{9}$/.test(cleaned))      return '+4' + cleaned         // 0745369041 → +40745369041
  if (/^\+40\d{9}$/.test(cleaned))   return cleaned                // already canonical
  if (/^40\d{9}$/.test(cleaned))     return '+' + cleaned          // 40745369041 → +40745369041
  if (/^0040\d{9}$/.test(cleaned))   return '+' + cleaned.slice(2) // 0040745369041 → +40745369041
  return null
}

export function isValidPhone(input: string | null | undefined): boolean {
  const normalized = normalizePhone(input)
  return normalized !== null && CANONICAL.test(normalized)
}
