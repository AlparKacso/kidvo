import { Resend } from 'resend'

const getResend = () => new Resend(process.env.RESEND_API_KEY)
const FROM       = 'kidvo <noreply@kidvo.eu>'
const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alpar.kacso@gmail.com'
const PURPLE     = '#523650'
const GOLD       = '#F0A500'

function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a0f1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td style="padding-bottom:20px;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">
      <span style="color:${PURPLE};">kid</span><span style="color:${GOLD};">vo</span>
    </span>
  </td></tr>

  <tr><td style="background:white;border-radius:12px;border:1px solid #e8e0ec;padding:32px;">
    ${body}
  </td></tr>

  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:#9b89a5;">
    kidvo · Timișoara, Romania ·
    <a href="${APP_URL}" style="color:#9b89a5;">kidvo.eu</a>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:${PURPLE};color:white;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">${text}</a>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:#1a0f1e;">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#4a3a52;">${text}</p>`
}

function disclaimer(text: string) {
  return `<p style="margin:16px 0 0;font-size:12px;color:#9b89a5;">${text}</p>`
}

function detailRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9b89a5;white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:13px;color:#1a0f1e;">${value}</td>
  </tr>`
}

function detailTable(rows: string) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f9f7fb;border-radius:8px;margin-bottom:24px;">${rows}</table>`
}

// ── 1. Provider receives new trial request ───────────────────────────────────
export async function sendNewTrialRequestToProvider(opts: {
  providerEmail: string
  listingTitle:  string
  parentName:    string
  parentEmail:   string
  preferredDay:  string | null
  message:       string | null
}) {
  const rows = [
    detailRow('Activity',      opts.listingTitle),
    detailRow('From',          opts.parentName),
    detailRow('Email',         `<a href="mailto:${opts.parentEmail}" style="color:${PURPLE};">${opts.parentEmail}</a>`),
    opts.preferredDay ? detailRow('Preferred day', opts.preferredDay) : '',
    opts.message      ? detailRow('Message',       `<em>${opts.message}</em>`)  : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.providerEmail,
    subject: `New trial request — ${opts.listingTitle}`,
    html: layout(`
      ${h1('New trial request')}
      ${p(`A parent wants to try <strong>${opts.listingTitle}</strong>. Confirm or decline from your dashboard.`)}
      ${detailTable(rows)}
      ${btn('View request →', `${APP_URL}/listings/bookings`)}
    `),
  })
}

// ── 2. Parent — trial confirmed ──────────────────────────────────────────────
export async function sendTrialConfirmedToParent(opts: {
  parentEmail:   string
  parentName:    string
  listingTitle:  string
  listingId:     string
  providerName:  string
  providerEmail: string
  providerPhone: string | null
}) {
  const rows = [
    detailRow('Provider', opts.providerName),
    detailRow('Email',    `<a href="mailto:${opts.providerEmail}" style="color:${PURPLE};">${opts.providerEmail}</a>`),
    opts.providerPhone ? detailRow('Phone', `<a href="tel:${opts.providerPhone}" style="color:${PURPLE};">${opts.providerPhone}</a>`) : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: `Trial confirmed — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Your trial is confirmed! 🎉')}
      ${p(`Great news, ${opts.parentName}! <strong>${opts.providerName}</strong> confirmed your trial for <strong>${opts.listingTitle}</strong>.`)}
      ${p('Reach out to arrange the details:')}
      ${detailTable(rows)}
      ${btn('View your bookings →', `${APP_URL}/bookings`)}
      ${disclaimer('All arrangements are directly between you and the provider. kidvo is not involved.')}
    `),
  })
}

// ── 3. Admin — new listing submitted ─────────────────────────────────────────
export async function sendNewListingToAdmin(opts: {
  listingId:     string
  listingTitle:  string
  providerName:  string
  providerEmail: string
}) {
  const rows = [
    detailRow('Activity',       opts.listingTitle),
    detailRow('Provider',       opts.providerName),
    detailRow('Provider email', `<a href="mailto:${opts.providerEmail}" style="color:${PURPLE};">${opts.providerEmail}</a>`),
    detailRow('Listing ID',     opts.listingId),
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: `New listing pending review — ${opts.listingTitle}`,
    html: layout(`
      ${h1('New listing submitted')}
      ${p(`<strong>${opts.providerName}</strong> submitted a new activity listing that is pending your review.`)}
      ${detailTable(rows)}
      ${btn('Review in Admin →', `${APP_URL}/admin`)}
    `),
  })
}

// ── 4. Admin — new review pending moderation ─────────────────────────────────
export async function sendNewReviewToAdmin(opts: {
  reviewId:     string
  listingTitle: string
  rating:       number
  comment:      string | null
  reviewerName: string
}) {
  const stars  = '★'.repeat(opts.rating) + '☆'.repeat(5 - opts.rating)
  const rows = [
    detailRow('Activity', opts.listingTitle),
    detailRow('Reviewer', opts.reviewerName),
    detailRow('Rating',   `${stars} (${opts.rating}/5)`),
    opts.comment ? detailRow('Comment', `<em>${opts.comment}</em>`) : '',
    detailRow('Review ID', opts.reviewId),
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: `New review pending moderation — ${opts.listingTitle}`,
    html: layout(`
      ${h1('New review to moderate')}
      ${p(`A parent submitted a review for <strong>${opts.listingTitle}</strong>. Please approve or reject it in the admin panel.`)}
      ${detailTable(rows)}
      ${btn('Moderate in Admin →', `${APP_URL}/admin`)}
    `),
  })
}

// ── 5. Parent — trial declined ───────────────────────────────────────────────
export async function sendTrialDeclinedToParent(opts: {
  parentEmail:  string
  parentName:   string
  listingTitle: string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: `Trial request update — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Trial not available')}
      ${p(`Hi ${opts.parentName}, unfortunately <strong>${opts.listingTitle}</strong> couldn't accommodate your trial at this time.`)}
      ${p('There are plenty of other great activities in Timișoara — find the right fit for your child.')}
      ${btn('Browse activities →', `${APP_URL}/browse`)}
    `),
  })
}

// ── 6. Parent — welcome ──────────────────────────────────────────────────────
export async function sendWelcomeToParent(opts: { email: string; name: string }) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: 'Welcome to kidvo! 🎉',
    html: layout(`
      ${h1('Welcome to kidvo!')}
      ${p(`Hi ${opts.name}, great to have you here!`)}
      ${p('kidvo helps Timișoara families discover and try the best activities for their kids — sports, arts, music, coding, and more.')}
      ${p('Browse activities now and request a trial session with providers — most offer a free first session, no payment required.')}
      ${btn('Browse activities →', `${APP_URL}/browse`)}
    `),
  })
}

// ── 7. Provider — welcome ─────────────────────────────────────────────────────
export async function sendWelcomeToProvider(opts: { email: string; name: string }) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: 'Welcome to kidvo — start listing!',
    html: layout(`
      ${h1('Welcome to kidvo!')}
      ${p(`Hi ${opts.name}, you're all set to start listing your activities on kidvo.`)}
      ${p('List your first activity and start receiving trial requests from interested parents. It only takes a few minutes.')}
      ${btn('List your first activity →', `${APP_URL}/listings/new`)}
      ${disclaimer('Your listing will be reviewed by our team within 24 hours before going live.')}
    `),
  })
}

// ── 8. Provider — listing approved ───────────────────────────────────────────
export async function sendListingApprovedToProvider(opts: {
  email:        string
  providerName: string
  listingTitle: string
  listingId:    string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `Your listing is live — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Your listing is live! 🎉')}
      ${p(`Great news, ${opts.providerName}! <strong>${opts.listingTitle}</strong> has been approved and is now visible to parents browsing kidvo.`)}
      ${p('Parents can now find your activity, save it, and request a trial session.')}
      ${btn('View your listing →', `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 9. Provider — listing rejected ───────────────────────────────────────────
export async function sendListingRejectedToProvider(opts: {
  email:        string
  providerName: string
  listingTitle: string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `Listing update — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Listing needs changes')}
      ${p(`Hi ${opts.providerName}, your listing <strong>${opts.listingTitle}</strong> couldn't be approved at this time.`)}
      ${p('Please review your listing details and make sure all information is complete and accurate. You can edit and resubmit from your dashboard.')}
      ${btn('Edit your listing →', `${APP_URL}/listings`)}
      ${disclaimer('Questions? Reach us at hello@kidvo.eu')}
    `),
  })
}

// ── 10. Parent — review approved ───────────────────────────────────────────────
export async function sendReviewApprovedToParent(opts: {
  email:        string
  parentName:   string
  listingTitle: string
  listingId:    string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `Your review is published — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Your review is live! 🎉')}
      ${p(`Hi ${opts.parentName}, your review for <strong>${opts.listingTitle}</strong> has been approved and is now visible to other parents.`)}
      ${p('Thank you for helping families in Timișoara find great activities for their kids!')}
      ${btn('View the listing →', `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 11. Parent — review rejected ──────────────────────────────────────────────
export async function sendReviewRejectedToParent(opts: {
  email:        string
  parentName:   string
  listingTitle: string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `Review update — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Review not approved')}
      ${p(`Hi ${opts.parentName}, unfortunately your review for <strong>${opts.listingTitle}</strong> couldn't be approved for publication.`)}
      ${p('If you have any questions, feel free to reach out to us.')}
      ${btn('Browse activities →', `${APP_URL}/browse`)}
      ${disclaimer('Questions? Reach us at hello@kidvo.eu')}
    `),
  })
}

// ── 12. Provider — review published on their listing ─────────────────────────
export async function sendReviewPublishedToProvider(opts: {
  email:        string
  providerName: string
  listingTitle: string
  listingId:    string
  rating:       number
  comment:      string | null
}) {
  const stars = '★'.repeat(opts.rating) + '☆'.repeat(5 - opts.rating)
  const rows  = [
    detailRow('Activity', opts.listingTitle),
    detailRow('Rating',   `${stars} (${opts.rating}/5)`),
    opts.comment ? detailRow('Comment', `<em>${opts.comment}</em>`) : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `New review on your listing — ${opts.listingTitle}`,
    html: layout(`
      ${h1('A new review is live on your listing! 🎉')}
      ${p(`Hi ${opts.providerName}, a parent left a review for <strong>${opts.listingTitle}</strong> that has been approved and is now public.`)}
      ${detailTable(rows)}
      ${btn('View your listing →', `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 13. User — account deleted confirmation ───────────────────────────────────
export async function sendAccountDeletedConfirmation(opts: { email: string; name: string }) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: 'Your kidvo account has been deleted',
    html: layout(`
      ${h1('Account deleted')}
      ${p(`Hi ${opts.name}, your kidvo account and all associated data have been permanently deleted.`)}
      ${p('We\'re sorry to see you go. If you ever want to return, you\'re always welcome to create a new account.')}
      ${disclaimer('If this was a mistake or you have questions, reach us at hello@kidvo.eu')}
    `),
  })
}

// ── 14. User — password reset link ────────────────────────────────────────────
export async function sendPasswordResetEmail(opts: { email: string; name: string; resetLink: string }) {
  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: 'Reset your kidvo password',
    html: layout(`
      ${h1('Reset your password')}
      ${p(`Hi ${opts.name}, click the button below to set a new password for your kidvo account.`)}
      ${btn('Reset password →', opts.resetLink)}
      ${p('This link expires in 1 hour. If you didn\'t request a password reset, you can safely ignore this email.')}
    `),
  })
}

// ── 15. Parent — new listings digest (P2 + P3) ───────────────────────────────
export async function sendNewListingsDigest(opts: {
  email:      string
  parentName: string
  listings:   { title: string; id: string; providerName: string; categoryName: string; isNewProvider: boolean }[]
}) {
  const items = opts.listings.map(l => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f0ecf4;">
        <div style="font-size:13px;font-weight:700;color:#1a0f1e;">${l.title}</div>
        <div style="font-size:12px;color:#9b89a5;margin-top:2px;">
          ${l.categoryName} · by ${l.providerName}
          ${l.isNewProvider ? `<span style="background:${GOLD};color:#1a0f1e;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:4px;">NEW PROVIDER</span>` : ''}
        </div>
        <a href="${APP_URL}/browse/${l.id}" style="font-size:12px;color:${PURPLE};font-weight:600;text-decoration:none;margin-top:4px;display:inline-block;">View activity →</a>
      </td>
    </tr>
  `).join('')

  const count = opts.listings.length

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: `${count} new ${count === 1 ? 'activity' : 'activities'} from providers you've saved`,
    html: layout(`
      ${h1('New activities from providers you follow')}
      ${p(`Hi ${opts.parentName}, here's what's new from providers you've saved:`)}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">${items}</table>
      ${btn('Browse all activities →', `${APP_URL}/browse`)}
      ${disclaimer("You're receiving this because you saved activities from these providers on kidvo.")}
    `),
  })
}

// ── Provider feedback ─────────────────────────────────────────────────────────
export async function sendProviderFeedback(
  providerName:  string,
  providerEmail: string,
  message:       string,
) {
  return getResend().emails.send({
    from:    FROM,
    to:      'hello@kidvo.eu',
    subject: `[Provider Feedback] ${providerName}`,
    html: layout(`
      ${h1('New provider feedback')}
      <p style="margin:0 0 16px;font-size:14px;color:#4a3a52;">
        <strong style="color:#1a0f1e;">${providerName}</strong>
        &nbsp;·&nbsp;${providerEmail}
      </p>
      <div style="padding:16px;background:#F5F4F6;border-radius:8px;font-size:14px;line-height:1.6;color:#1a0f1e;">
        ${message.replace(/\n/g, '<br>')}
      </div>
    `),
  })
}
