import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendWaitlistDeclineToParent,
  sendEnrollmentToParent,
  sendEnrollmentToProvider,
  sendEnrollDeclinedToParent,
} from '@/lib/email'
import { createNotification } from '@/lib/notifications'

interface MemberRow {
  id: string
  class_id: string
  status: string
  waitlist_entry_id: string | null
  child_id: string | null
  child_name: string
  contact_name: string | null
  contact_email: string | null
  class: {
    name: string
    provider: {
      user_id: string
      display_name: string
      contact_email: string | null
      contact_phone: string | null
      user: { email: string | null; locale: string | null } | null
    } | null
    listing: { title: string } | null
  } | null
}

const SELECT = `
  id, class_id, status, waitlist_entry_id, child_id, child_name, contact_name, contact_email,
  class:classes(name, provider:providers(user_id, display_name, contact_email, contact_phone, user:users(email, locale)), listing:listings(title))
`

// Parent lookup (cross-user) for a roster member's child — user id (for in-app
// notifications) + locale (for emails).
async function parentInfo(adminDb: ReturnType<typeof createAdminClient>, childId: string | null): Promise<{ userId: string | null; locale: 'en' | 'ro' }> {
  if (!childId) return { userId: null, locale: 'ro' }
  const { data: childRaw } = await adminDb.from('children').select('user_id').eq('id', childId).single()
  const uid = (childRaw as { user_id: string } | null)?.user_id ?? null
  if (!uid) return { userId: null, locale: 'ro' }
  const { data: uRaw } = await adminDb.from('users').select('locale').eq('id', uid).single()
  return { userId: uid, locale: (uRaw as { locale: string | null } | null)?.locale === 'en' ? 'en' : 'ro' }
}

async function loadOwned(supabase: Awaited<ReturnType<typeof createClient>>, id: string, userId: string) {
  const { data } = await supabase.from('roster_members').select(SELECT).eq('id', id).single()
  const member = data as unknown as MemberRow | null
  if (!member || member.class?.provider?.user_id !== userId) return null
  return member
}

// PATCH — { action: 'move', class_id } | { action: 'return_to_pool' }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await loadOwned(supabase, id, user.id)
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { action, class_id } = await req.json()

  if (action === 'move') {
    if (!class_id) return NextResponse.json({ error: 'Missing class_id' }, { status: 400 })
    // Verify the destination class also belongs to this provider.
    const { data: destRaw } = await supabase
      .from('classes').select('id, provider:providers(user_id)').eq('id', class_id).single()
    const dest = destRaw as { id: string; provider: { user_id: string } | null } | null
    if (!dest || dest.provider?.user_id !== user.id) {
      return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
    }
    const { error } = await supabase
      .from('roster_members').update({ class_id, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Provider confirms a parent's enroll request → enrolled + enrollment emails.
  if (action === 'confirm') {
    if (member.status !== 'requested') {
      return NextResponse.json({ error: 'not_requested' }, { status: 409 })
    }
    const { error } = await supabase
      .from('roster_members').update({ status: 'enrolled', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const adminDb = createAdminClient()
    const prov = member.class?.provider
    const providerEmail = prov?.contact_email || prov?.user?.email || ''
    const listingTitle  = member.class?.listing?.title ?? member.class?.name ?? ''
    const parent = await parentInfo(adminDb, member.child_id)

    // In-app notification — the calendar block flips pending → enrolled on refresh.
    if (parent.userId) {
      await createNotification(adminDb, parent.userId, 'enroll_confirmed', {
        childName:    member.child_name,
        listingTitle,
        providerName: prov?.display_name ?? '',
      })
    }

    const sends: Promise<unknown>[] = []
    if (member.contact_email) {
      sends.push(sendEnrollmentToParent({
        parentEmail:   member.contact_email,
        parentName:    member.contact_name ?? '',
        childName:     member.child_name,
        listingTitle,
        providerName:  prov?.display_name ?? '',
        providerEmail,
        providerPhone: prov?.contact_phone ?? null,
        locale:        parent.locale,
      }))
    }
    if (providerEmail) {
      sends.push(sendEnrollmentToProvider({
        providerEmail,
        parentName:   member.contact_name ?? '',
        childName:    member.child_name,
        listingTitle,
        locale:       prov?.user?.locale === 'en' ? 'en' : 'ro',
      }))
    }
    for (const r of await Promise.allSettled(sends)) {
      if (r.status === 'rejected') console.error('[enroll confirm email]', r.reason)
    }
    return NextResponse.json({ ok: true })
  }

  // Provider declines a parent's enroll request → declined + polite note.
  if (action === 'decline_request') {
    if (member.status !== 'requested') {
      return NextResponse.json({ error: 'not_requested' }, { status: 409 })
    }
    const { error } = await supabase
      .from('roster_members').update({ status: 'declined', updated_at: new Date().toISOString() }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const adminDb = createAdminClient()
    const parent = await parentInfo(adminDb, member.child_id)
    const listingTitle = member.class?.listing?.title ?? member.class?.name ?? ''

    if (parent.userId) {
      await createNotification(adminDb, parent.userId, 'enroll_declined', {
        childName:    member.child_name,
        listingTitle,
        providerName: member.class?.provider?.display_name ?? '',
      })
    }
    if (member.contact_email) {
      await sendEnrollDeclinedToParent({
        parentEmail:  member.contact_email,
        parentName:   member.contact_name ?? '',
        childName:    member.child_name,
        providerName: member.class?.provider?.display_name ?? '',
        listingTitle,
        locale:       parent.locale,
      }).catch(e => console.error('[enroll decline email]', e))
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'return_to_pool') {
    if (member.waitlist_entry_id) {
      await supabase.from('waitlist_entries').update({ status: 'waiting' }).eq('id', member.waitlist_entry_id)
      // Invalidate any still-pending offer so a stale Accept email can't resurrect this member.
      await supabase.from('offers').update({ phase: 'expired', responded_at: new Date().toISOString() })
        .eq('waitlist_entry_id', member.waitlist_entry_id).eq('phase', 'pending')
    }
    const { error } = await supabase.from('roster_members').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'bad_action' }, { status: 400 })
}

// DELETE — remove from the platform. ?decline=1 emails a polite note (waitlisted).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const member = await loadOwned(supabase, id, user.id)
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const sendDecline = new URL(req.url).searchParams.get('decline') === '1'

  if (member.waitlist_entry_id) {
    await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', member.waitlist_entry_id)
    // Invalidate any still-pending offer so a stale Accept email can't resurrect this member.
    await supabase.from('offers').update({ phase: 'expired', responded_at: new Date().toISOString() })
      .eq('waitlist_entry_id', member.waitlist_entry_id).eq('phase', 'pending')
  }

  const { error } = await supabase.from('roster_members').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (sendDecline && member.contact_email) {
    // Parent locale lookup needs the cross-user admin client.
    const adminDb = createAdminClient()
    let locale: 'en' | 'ro' = 'ro'
    if (member.waitlist_entry_id) {
      const { data: entryRaw } = await adminDb
        .from('waitlist_entries').select('user_id').eq('id', member.waitlist_entry_id).single()
      const uid = (entryRaw as { user_id: string } | null)?.user_id
      if (uid) {
        const { data: uRaw } = await adminDb.from('users').select('locale').eq('id', uid).single()
        locale = (uRaw as { locale: string | null } | null)?.locale === 'en' ? 'en' : 'ro'
      }
    }
    await sendWaitlistDeclineToParent({
      parentEmail:  member.contact_email,
      parentName:   member.contact_name ?? '',
      providerName: member.class?.provider?.display_name ?? '',
      listingTitle: member.class?.listing?.title ?? member.class?.name ?? '',
      locale,
    }).catch(e => console.error('[waitlist decline email]', e))
  }

  return NextResponse.json({ ok: true })
}
