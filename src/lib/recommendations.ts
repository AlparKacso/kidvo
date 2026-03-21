/** Score + pick a recommendation for a given kid from a listings pool.
 *  Kept in a plain (non-client) module so it can be called from server components.
 */
export function pickRecommendation(
  kid: { birth_year: number; interests?: string[]; area_id?: string | null },
  listings: any[],
  excludeIds: Set<string>,
): any | null {
  const kidAge = new Date().getFullYear() - kid.birth_year
  const scored = listings
    .filter((l: any) => !excludeIds.has(l.id))
    .map((l: any) => {
      let score = 0
      if ((kid.interests ?? []).includes(l.category?.slug ?? '')) score += 3
      if (l.age_min <= kidAge && l.age_max >= kidAge)              score += 2
      if (kid.area_id && l.area_id === kid.area_id)                score += 1
      return { ...l, _score: score }
    })
    .sort((a: any, b: any) => b._score - a._score)

  const topPool = scored.slice(0, 5)
  if (topPool.length === 0) return listings[0] ?? null
  return topPool[Math.floor(Math.random() * topPool.length)]
}
