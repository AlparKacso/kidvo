import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendReviewApprovedToParent,
  sendReviewRejectedToParent,
  sendReviewPublishedToProvider,
} from '@/lib/email'

const ADMIN_EMAIL = 'alpar.kacso@gmail.com'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const { action } = await request.json()

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve or reject' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin-only
  const { data: userRow } = await supabase.from('users').select('email').eq('id', user.id).single()
  if ((userRow as any)?.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch review with reviewer + listing + provider info before updating
  const { data: reviewRaw } = await supabase
    .from('reviews')
    .select(`
      id, rating, comment,
      listing:listings(id, title, provider:providers(display_name, contact_email)),
      reviewer:users(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  const status = action === 'approve' ? 'approved' : 'rejected'
  const { error } = await supabase.from('reviews').update({ status }).eq('id', id)

  if (error) {
    console.error('Review moderate error:', error)
    return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
  }

  // Fire notification emails (non-blocking — don't fail the request if email fails)
  const review   = reviewRaw as any
  const reviewer = review?.reviewer
  const listing  = review?.listing
  const provider = listing?.provider

  if (action === 'approve') {
    const emailJobs: Promise<any>[] = []

    // P5: notify parent their review is published
    if (reviewer?.email && listing?.title && listing?.id) {
      emailJobs.push(
        sendReviewApprovedToParent({
          email:        reviewer.email,
          parentName:   reviewer.full_name ?? reviewer.email,
          listingTitle: listing.title,
          listingId:    listing.id,
        }).catch(err => console.error('P5 email error:', err))
      )
    }

    // V4: notify provider a new review is live on their listing
    if (provider?.contact_email && listing?.title && listing?.id) {
      emailJobs.push(
        sendReviewPublishedToProvider({
          email:        provider.contact_email,
          providerName: provider.display_name ?? provider.contact_email,
          listingTitle: listing.title,
          listingId:    listing.id,
          rating:       review.rating,
          comment:      review.comment ?? null,
        }).catch(err => console.error('V4 email error:', err))
      )
    }

    await Promise.all(emailJobs)
  } else {
    // P6: notify parent their review was rejected
    if (reviewer?.email && listing?.title) {
      await sendReviewRejectedToParent({
        email:        reviewer.email,
        parentName:   reviewer.full_name ?? reviewer.email,
        listingTitle: listing.title,
      }).catch(err => console.error('P6 email error:', err))
    }
  }

  return NextResponse.json({ ok: true, status })
}
