// Localize a category name for display.
//
// Category names are stored in the DB in a single language (and the two
// environments have drifted: prod uses Romanian names + the legacy
// 'arts-crafts' slug, staging uses English names + 'arts'). The 'categories'
// i18n namespace is keyed by slug, so prefer the translated name and fall
// back to the stored DB name when the slug has no translation.
//
// Works with both the server (getTranslations) and client (useTranslations)
// translators scoped to the 'categories' namespace — both expose a callable
// `t(key)` and a `t.has(key)` guard.

type CategoryTranslator = {
  (key: string): string
  has: (key: string) => boolean
}

export function localizeCategoryName(
  tCat: CategoryTranslator,
  category: { slug?: string | null; name?: string | null } | null | undefined,
): string {
  if (!category) return ''
  const slug = category.slug ?? ''
  return slug && tCat.has(slug) ? tCat(slug) : (category.name ?? '')
}
