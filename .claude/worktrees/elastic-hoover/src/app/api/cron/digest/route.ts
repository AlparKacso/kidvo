import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendNewListingsDigest } from '@/lib/email'

export const dynamic = 'force-dynamic'

// GET /api/cron/digest
// Called daily by Vercel Cron (see vercel.json).
// Finds all listings published in the last 24 h and emails parents
// who have saved any activity from those providers.
export async function GET(req: NextRequest) {
  // Vercel automatically injects CRON_SECRET as the bearer token
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff   = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // ── 1. New listings published in the last 24 h ────────────────────────────
  const { data: newListingsRaw } = await supabase
    .from('listings')
    .select('id, title, provider_id, provider:providers(display_name), category:categories(name)')
    .gte('published_at', cutoff)
    .eq('status', 'active')

  const newListings = (newListingsRaw as any[]) ?? []

  if (newListings.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no new listings' })
  }

  const providerIds = [...new Set<string>(newListings.map((l: any) => l.provider_id))]

  // ── 2. Which providers are "new" (no listing published before the cutoff) ─
  const { data: existingListingsRaw } = await supabase
    .from('listings')
    .select('provider_id')
    .in('provider_id', providerIds)
    .lt('published_at', cutoff)
    .eq('status', 'active')

  const provsWithPrevListings = new Set<string>(
    ((existingListingsRaw as any[]) ?? []).map((l: any) => l.provider_id)
  )

  // ── 3. All listing IDs from these providers (to look up saves) ────────────
  const { data: allProviderListingsRaw } = await supabase
    .from('listings')
    .select('id, provider_id')
    .in('provider_id', providerIds)

  const allProviderListings   = (allProviderListingsRaw as any[]) ?? []
  const allProviderListingIds = allProviderListings.map((l: any) => l.id)

  if (allProviderListingIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no provider listings found' })
  }

  // ── 4. Parents who saved any listing from these providers ─────────────────
  const { data: savesRaw } = await supabase
    .from('saves')
    .select('user_id, listing_id')
    .in('listing_id', allProviderListingIds)

  const saves = (savesRaw as any[]) ?? []

  if (saves.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, reason: 'no followers' })
  }

  // Build a map: listing_id → provider_id (from allProviderListings)
  const listingToProvider = new Map<string, string>()
  for (const l of allProviderListings) {
    listingToProvider.set(l.id, l.provider_id)
  }

  // Build a map: user_id → set of followed provider_ids
  const userToProviders = new Map<string, Set<string>>()
  for (const save of saves) {
    const pid = listingToProvider.get(save.listing_id)
    if (!pid) continue
    if (!userToProviders.has(save.user_id)) {
      userToProviders.set(save.user_id, new Set())
    }
    userToProviders.get(save.user_id)!.add(pid)
  }

  // ── 5. Fetch parent user info ─────────────────────────────────────────────
  const uniqueUserIds = [...userToProviders.keys()]

  const { data: parentsRaw } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .in('id', uniqueUserIds)
    .eq('role', 'parent')

  const parents = (parentsRaw as any[]) ?? []

  // ── 6. Send one digest per parent ─────────────────────────────────────────
  let sent = 0
  const emailJobs: Promise<any>[] = []

  for (const parent of parents) {
    const followedProviders = userToProviders.get(parent.id) ?? new Set<string>()

    // Only include new listings from providers this parent follows
    const relevantListings = newListings.filter((l: any) =>
      followedProviders.has(l.provider_id)
    )

    if (relevantListings.length === 0) continue

    const listings = relevantListings.map((l: any) => ({
      title:         l.title,
      id:            l.id,
      providerName:  (l.provider as any)?.display_name ?? 'Provider',
      categoryName:  (l.category as any)?.name ?? 'Activity',
      isNewProvider: !provsWithPrevListings.has(l.provider_id),
    }))

    emailJobs.push(
      sendNewListingsDigest({
        email:      parent.email,
        parentName: parent.full_name ?? parent.email,
        listings,
      }).catch(err => console.error(`Digest email failed for ${parent.email}:`, err))
    )

    sent++
  }

  await Promise.all(emailJobs)

  return NextResponse.json({ ok: true, sent })
}
