import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendNewReviewToAdmin } from '@/lib/email'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { rating, comment } = await request.json()

    if (rating === undefined && comment === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch the review — verify ownership
    const { data: review } = await supabase
      .from('reviews')
      .select('id, user_id, listing_id, rating, comment, status')
      .eq('id', id)
      .single()

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    if (review.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const newRating  = rating  ?? review.rating
    const newComment = comment !== undefined
      ? (typeof comment === 'string' && comment.trim() ? comment.trim() : null)
      : review.comment

    const commentChanged = newComment !== review.comment

    // Status logic (per spec):
    //   text changed → always 'pending' (needs re-moderation)
    //   rating only, currently 'approved' → keep 'approved' (instant update)
    //   rating only, currently 'rejected' → 'pending' (re-submit for moderation)
    //   rating only, currently 'pending'  → keep 'pending'
    let newStatus = review.status as 'pending' | 'approved' | 'rejected'
    if (commentChanged) {
      newStatus = 'pending'
    } else if (review.status === 'rejected') {
      newStatus = 'pending'
    }
    // else: approved stays approved, pending stays pending

    const { data: updated, error: updateError } = await supabase
      .from('reviews')
      .update({ rating: newRating, comment: newComment, status: newStatus })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Review update error:', updateError)
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    // Notify admin when review transitions into moderation queue
    if (newStatus === 'pending' && review.status !== 'pending') {
      const [{ data: userRow }, { data: listingRow }] = await Promise.all([
        supabase.from('users').select('full_name').eq('id', user.id).single(),
        supabase.from('listings').select('title').eq('id', review.listing_id).single(),
      ])
      await sendNewReviewToAdmin({
        reviewId:     review.id,
        listingTitle: (listingRow as any)?.title ?? review.listing_id,
        rating:       newRating,
        comment:      newComment,
        reviewerName: (userRow as any)?.full_name ?? user.email ?? 'Unknown',
      }).catch(console.error)
    }

    return NextResponse.json({ ok: true, review: updated })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 500 })
  }
}
