import { Resend } from 'resend'
import { emailT, interp, label, type Locale } from './email-translations'

const getResend = () => new Resend(process.env.RESEND_API_KEY)
const FROM        = 'kidvo <noreply@kidvo.eu>'
const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kidvo.eu'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'alpar.kacso@gmail.com'
const INK         = '#1c1c27'   // ink       — headings, primary text
const PRIMARY     = '#7c3aed'   // primary   — buttons, links, logo "vo"
const GOLD        = '#f5c542'   // gold      — accent badges

function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ece8f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:${INK};">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td style="padding-bottom:20px;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">
      <span style="color:${INK};">kid</span><span style="color:${PRIMARY};">vo</span>
    </span>
  </td></tr>

  <tr><td style="background:white;border-radius:12px;border:1px solid #e8e4f0;padding:32px;">
    ${body}
  </td></tr>

  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:#9590b3;">
    kidvo · Timișoara, Romania ·
    <a href="${APP_URL}" style="color:#9590b3;">kidvo.eu</a>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;margin:8px 0 16px;background:${PRIMARY};color:white;font-weight:700;font-size:13px;padding:10px 20px;border-radius:8px;text-decoration:none;">${text}</a>`
}

function h1(text: string) {
  return `<h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:${INK};">${text}</h1>`
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#55527a;">${text}</p>`
}

function disclaimer(text: string) {
  return `<p style="margin:16px 0 0;font-size:12px;color:#9590b3;">${text}</p>`
}

function detailRow(lbl: string, value: string) {
  return `<tr>
    <td style="padding:8px 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#9590b3;white-space:nowrap;">${lbl}</td>
    <td style="padding:8px 12px;font-size:13px;color:${INK};">${value}</td>
  </tr>`
}

function detailTable(rows: string) {
  return `<table cellpadding="0" cellspacing="0" style="width:100%;background:#f0e8ff;border-radius:8px;margin-bottom:24px;">${rows}</table>`
}

// ── 1. Provider receives new trial request ───────────────────────────────────
export async function sendNewTrialRequestToProvider(opts: {
  providerEmail: string
  listingTitle:  string
  parentName:    string
  parentEmail:   string
  preferredDay:  string | null
  message:       string | null
  locale:        Locale
}) {
  const t = emailT('newTrialRequest', opts.locale)
  const l = (k: keyof typeof import('./email-translations').labels) => label(k, opts.locale)

  const rows = [
    detailRow(l('activity'),      opts.listingTitle),
    detailRow(l('from'),          opts.parentName),
    detailRow(l('email'),         `<a href="mailto:${opts.parentEmail}" style="color:${PRIMARY};">${opts.parentEmail}</a>`),
    opts.preferredDay ? detailRow(l('preferredDay'), opts.preferredDay) : '',
    opts.message      ? detailRow(l('message'),       `<em>${opts.message}</em>`)  : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.providerEmail,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { listing: opts.listingTitle }))}
      ${detailTable(rows)}
      ${btn(t.cta, `${APP_URL}/dashboard`)}
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
  locale:        Locale
}) {
  const t = emailT('trialConfirmed', opts.locale)
  const l = (k: keyof typeof import('./email-translations').labels) => label(k, opts.locale)

  const rows = [
    detailRow(l('provider'), opts.providerName),
    detailRow(l('email'),    `<a href="mailto:${opts.providerEmail}" style="color:${PRIMARY};">${opts.providerEmail}</a>`),
    opts.providerPhone ? detailRow(l('phone'), `<a href="tel:${opts.providerPhone}" style="color:${PRIMARY};">${opts.providerPhone}</a>`) : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName, provider: opts.providerName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${detailTable(rows)}
      ${btn(t.cta, `${APP_URL}/bookings`)}
      ${disclaimer(t.disclaimer)}
    `),
  })
}

// ── 3. Admin — new listing submitted (always English) ────────────────────────
export async function sendNewListingToAdmin(opts: {
  listingId:     string
  listingTitle:  string
  providerName:  string
  providerEmail: string
}) {
  const rows = [
    detailRow('Activity',       opts.listingTitle),
    detailRow('Provider',       opts.providerName),
    detailRow('Provider email', `<a href="mailto:${opts.providerEmail}" style="color:${PRIMARY};">${opts.providerEmail}</a>`),
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

// ── 4. Admin — new review pending moderation (always English) ────────────────
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
  locale:       Locale
}) {
  const t = emailT('trialDeclined', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/browse`)}
    `),
  })
}

// ── 6. Parent — welcome ──────────────────────────────────────────────────────
export async function sendWelcomeToParent(opts: { email: string; name: string; locale: Locale }) {
  const t = emailT('welcomeParent', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: t.subject,
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.name }))}
      ${p(t.body2)}
      ${p(t.body3)}
      ${btn(t.cta, `${APP_URL}/browse`)}
    `),
  })
}

// ── 7. Provider — welcome ─────────────────────────────────────────────────────
export async function sendWelcomeToProvider(opts: { email: string; name: string; locale: Locale }) {
  const t = emailT('welcomeProvider', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: t.subject,
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.name }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/listings/new`)}
      ${disclaimer(t.disclaimer)}
    `),
  })
}

// ── 8. Provider — listing approved ───────────────────────────────────────────
export async function sendListingApprovedToProvider(opts: {
  email:        string
  providerName: string
  listingTitle: string
  listingId:    string
  locale:       Locale
}) {
  const t = emailT('listingApproved', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.providerName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 9. Provider — listing rejected ───────────────────────────────────────────
export async function sendListingRejectedToProvider(opts: {
  email:        string
  providerName: string
  listingTitle: string
  locale:       Locale
}) {
  const t = emailT('listingRejected', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.providerName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/listings`)}
      ${disclaimer(t.disclaimer)}
    `),
  })
}

// ── 10. Parent — review approved ───────────────────────────────────────────────
export async function sendReviewApprovedToParent(opts: {
  email:        string
  parentName:   string
  listingTitle: string
  listingId:    string
  locale:       Locale
}) {
  const t = emailT('reviewApproved', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 11. Parent — review rejected ──────────────────────────────────────────────
export async function sendReviewRejectedToParent(opts: {
  email:        string
  parentName:   string
  listingTitle: string
  locale:       Locale
}) {
  const t = emailT('reviewRejected', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName, listing: opts.listingTitle }))}
      ${p(t.body2)}
      ${btn(t.cta, `${APP_URL}/browse`)}
      ${disclaimer(t.disclaimer)}
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
  locale:       Locale
}) {
  const t = emailT('reviewPublished', opts.locale)
  const l = (k: keyof typeof import('./email-translations').labels) => label(k, opts.locale)
  const stars = '★'.repeat(opts.rating) + '☆'.repeat(5 - opts.rating)
  const rows  = [
    detailRow(l('activity'), opts.listingTitle),
    detailRow(l('rating'),   `${stars} (${opts.rating}/5)`),
    opts.comment ? detailRow(l('comment'), `<em>${opts.comment}</em>`) : '',
  ].join('')

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.providerName, listing: opts.listingTitle }))}
      ${detailTable(rows)}
      ${btn(t.cta, `${APP_URL}/browse/${opts.listingId}`)}
    `),
  })
}

// ── 13. User — account deleted confirmation ───────────────────────────────────
export async function sendAccountDeletedConfirmation(opts: { email: string; name: string; locale: Locale }) {
  const t = emailT('accountDeleted', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: t.subject,
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.name }))}
      ${p(t.body2)}
      ${disclaimer(t.disclaimer)}
    `),
  })
}

// ── 14. User — password reset link ────────────────────────────────────────────
export async function sendPasswordResetEmail(opts: { email: string; name: string; resetLink: string; locale: Locale }) {
  const t = emailT('passwordReset', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject: t.subject,
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.name }))}
      ${btn(t.cta, opts.resetLink)}
      ${p(t.body2)}
    `),
  })
}

// ── 15. Parent — new listings digest ─────────────────────────────────────────
export async function sendNewListingsDigest(opts: {
  email:      string
  parentName: string
  listings:   { title: string; id: string; providerName: string; categoryName: string; isNewProvider: boolean }[]
  locale:     Locale
}) {
  const t = emailT('digest', opts.locale)
  const l = (k: keyof typeof import('./email-translations').labels) => label(k, opts.locale)

  const items = opts.listings.map(li => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e8e4f0;">
        <div style="font-size:13px;font-weight:700;color:${INK};">${li.title}</div>
        <div style="font-size:12px;color:#9590b3;margin-top:2px;">
          ${li.categoryName} · ${l('by')} ${li.providerName}
          ${li.isNewProvider ? `<span style="background:${GOLD};color:${INK};font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;margin-left:4px;">${l('newProvider')}</span>` : ''}
        </div>
        <a href="${APP_URL}/browse/${li.id}" style="font-size:12px;color:${PRIMARY};font-weight:600;text-decoration:none;margin-top:4px;display:inline-block;">${l('viewActivity')}</a>
      </td>
    </tr>
  `).join('')

  const count = opts.listings.length
  const subject = count === 1
    ? t.subjectOne
    : interp(t.subjectMany, { count: String(count) })

  return getResend().emails.send({
    from:    FROM,
    to:      opts.email,
    subject,
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName }))}
      <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:24px;">${items}</table>
      ${btn(t.cta, `${APP_URL}/browse`)}
      ${disclaimer(t.disclaimer)}
    `),
  })
}

// ── 16. Provider — trial cancelled by parent ──────────────────────────────────
export async function sendTrialCancelledByParent(opts: {
  providerEmail: string
  providerName:  string
  listingTitle:  string
  locale:        Locale
}) {
  const t = emailT('trialCancelledByParent', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.providerEmail,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.providerName }))}
      ${p(interp(t.body2, { listing: opts.listingTitle }))}
      ${btn(t.cta, `${APP_URL}/listings`)}
    `),
  })
}

// ── 17. Parent — provider account deleted, trial cancelled ───────────────────
export async function sendTrialCancelledProviderDeleted(opts: {
  parentEmail:  string
  parentName:   string
  listingTitle: string
  locale:       Locale
}) {
  const t = emailT('trialCancelledProviderDeleted', opts.locale)

  return getResend().emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: interp(t.subject, { listing: opts.listingTitle }),
    html: layout(`
      ${h1(t.heading)}
      ${p(interp(t.body, { name: opts.parentName }))}
      ${p(interp(t.body2, { listing: opts.listingTitle }))}
      ${p(t.body3)}
      ${btn(t.cta, `${APP_URL}/browse`)}
    `),
  })
}

// ── 18. Admin — provider left (always English) ──────────────────────────────
export async function sendAdminProviderLeft(opts: {
  providerEmail: string
  providerName:  string
}) {
  return getResend().emails.send({
    from:    FROM,
    to:      ADMIN_EMAIL,
    subject: `[kidvo] Provider left — ${opts.providerName}`,
    html: layout(`
      ${h1('A provider deleted their account')}
      ${p(`<strong>${opts.providerName}</strong> (${opts.providerEmail}) has deleted their account.`)}
      ${p('Their listings and all pending trial requests have been removed. Affected parents have been notified by email.')}
    `),
  })
}

// ── Provider feedback (always English, goes to hello@kidvo.eu) ───────────────
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
      <p style="margin:0 0 16px;font-size:14px;color:#55527a;">
        <strong style="color:${INK};">${providerName}</strong>
        &nbsp;·&nbsp;${providerEmail}
      </p>
      <div style="padding:16px;background:#ece8f5;border-radius:8px;font-size:14px;line-height:1.6;color:${INK};">
        ${message.replace(/\n/g, '<br>')}
      </div>
    `),
  })
}
