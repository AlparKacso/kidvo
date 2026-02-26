import { Resend } from 'resend'

const resend   = new Resend(process.env.RESEND_API_KEY)
const FROM     = 'kindo <onboarding@resend.dev>'
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kindo.ro'
const PURPLE   = '#523650'
const GOLD     = '#F0A500'

function layout(body: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F4F6;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a0f1e;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

  <tr><td style="padding-bottom:20px;">
    <span style="font-size:20px;font-weight:800;letter-spacing:-0.02em;">
      <span style="color:${PURPLE};">k</span><span style="color:${GOLD};">i</span><span style="color:${PURPLE};">ndo</span>
    </span>
  </td></tr>

  <tr><td style="background:white;border-radius:12px;border:1px solid #e8e0ec;padding:32px;">
    ${body}
  </td></tr>

  <tr><td style="padding-top:20px;text-align:center;font-size:11px;color:#9b89a5;">
    kindo · Timișoara, Romania ·
    <a href="${APP_URL}" style="color:#9b89a5;">kindo.ro</a>
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

  return resend.emails.send({
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
  providerName:  string
  providerEmail: string
  providerPhone: string | null
}) {
  const rows = [
    detailRow('Provider', opts.providerName),
    detailRow('Email',    `<a href="mailto:${opts.providerEmail}" style="color:${PURPLE};">${opts.providerEmail}</a>`),
    opts.providerPhone ? detailRow('Phone', `<a href="tel:${opts.providerPhone}" style="color:${PURPLE};">${opts.providerPhone}</a>`) : '',
  ].join('')

  return resend.emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: `Trial confirmed — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Your trial is confirmed! 🎉')}
      ${p(`Great news, ${opts.parentName}! <strong>${opts.providerName}</strong> confirmed your trial for <strong>${opts.listingTitle}</strong>.`)}
      ${p('Reach out to arrange the details:')}
      ${detailTable(rows)}
      ${btn('View your bookings →', `${APP_URL}/bookings`)}
      <p style="margin:16px 0 0;font-size:12px;color:#9b89a5;">All arrangements are directly between you and the provider. kindo is not involved.</p>
    `),
  })
}

// ── 3. Parent — trial declined ───────────────────────────────────────────────
export async function sendTrialDeclinedToParent(opts: {
  parentEmail:  string
  parentName:   string
  listingTitle: string
}) {
  return resend.emails.send({
    from:    FROM,
    to:      opts.parentEmail,
    subject: `Trial request update — ${opts.listingTitle}`,
    html: layout(`
      ${h1('Trial request update')}
      ${p(`Hi ${opts.parentName}, unfortunately <strong>${opts.listingTitle}</strong> couldn't accommodate your trial at this time.`)}
      ${p('There are plenty of other great activities in Timișoara — find the right fit for your child.')}
      ${btn('Browse activities →', `${APP_URL}/browse`)}
    `),
  })
}
