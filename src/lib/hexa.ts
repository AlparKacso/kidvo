/**
 * Convert a `#rrggbb` hex string to an `rgba(...)` string at the given alpha.
 * Used across the landing pages for tinted backgrounds, glows and borders.
 */
export function hexa(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return `rgba(124,58,237,${alpha})`
  return `rgba(${r},${g},${b},${alpha})`
}
