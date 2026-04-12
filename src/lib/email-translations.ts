export type Locale = 'ro' | 'en'

/** Simple placeholder replacement: '{name}' → value */
export function interp(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, v),
    template,
  )
}

// ── Shared labels ────────────────────────────────────────────────────────────

export const labels = {
  activity:     { en: 'Activity',      ro: 'Activitate' },
  from:         { en: 'From',          ro: 'De la' },
  email:        { en: 'Email',         ro: 'Email' },
  preferredDay: { en: 'Preferred day', ro: 'Ziua preferată' },
  message:      { en: 'Message',       ro: 'Mesaj' },
  provider:     { en: 'Provider',      ro: 'Furnizor' },
  phone:        { en: 'Phone',         ro: 'Telefon' },
  rating:       { en: 'Rating',        ro: 'Rating' },
  comment:      { en: 'Comment',       ro: 'Comentariu' },
  viewActivity: { en: 'View activity →', ro: 'Vezi activitatea →' },
  newProvider:  { en: 'NEW PROVIDER',  ro: 'FURNIZOR NOU' },
  by:           { en: 'by',            ro: 'de' },
} as const

export function label(key: keyof typeof labels, locale: Locale): string {
  return labels[key][locale]
}

// ── Email translations ───────────────────────────────────────────────────────

const translations = {
  // #1 — Provider receives new trial request
  newTrialRequest: {
    en: {
      subject:  'New trial request — {listing}',
      heading:  'New trial request',
      body:     'A parent wants to try <strong>{listing}</strong>. Confirm or decline from your dashboard.',
      cta:      'View request →',
    },
    ro: {
      subject:  'Cerere nouă de probă — {listing}',
      heading:  'Cerere nouă de probă',
      body:     'Un părinte dorește să încerce <strong>{listing}</strong>. Confirmă sau refuză din dashboard-ul tău.',
      cta:      'Vezi cererea →',
    },
  },

  // #2 — Parent: trial confirmed
  trialConfirmed: {
    en: {
      subject:     'Trial confirmed — {listing}',
      heading:     'Your trial is confirmed! 🎉',
      body:        'Great news, {name}! <strong>{provider}</strong> confirmed your trial for <strong>{listing}</strong>.',
      body2:       'Reach out to arrange the details:',
      cta:         'View your bookings →',
      disclaimer:  'All arrangements are directly between you and the provider. kidvo is not involved.',
    },
    ro: {
      subject:     'Probă confirmată — {listing}',
      heading:     'Proba ta a fost confirmată! 🎉',
      body:        'Vești bune, {name}! <strong>{provider}</strong> a confirmat proba ta pentru <strong>{listing}</strong>.',
      body2:       'Contactează-i pentru a aranja detaliile:',
      cta:         'Vezi rezervările tale →',
      disclaimer:  'Toate aranjamentele sunt direct între tine și furnizor. kidvo nu este implicat.',
    },
  },

  // #5 — Parent: trial declined
  trialDeclined: {
    en: {
      subject:  'Trial request update — {listing}',
      heading:  'Trial not available',
      body:     'Hi {name}, unfortunately <strong>{listing}</strong> couldn\'t accommodate your trial at this time.',
      body2:    'There are plenty of other great activities in Timișoara — find the right fit for your child.',
      cta:      'Browse activities →',
    },
    ro: {
      subject:  'Actualizare cerere de probă — {listing}',
      heading:  'Probă indisponibilă',
      body:     'Bună {name}, din păcate <strong>{listing}</strong> nu a putut acomoda proba ta în acest moment.',
      body2:    'Există o mulțime de alte activități minunate în Timișoara — găsește ce se potrivește copilului tău.',
      cta:      'Explorează activitățile →',
    },
  },

  // #6 — Parent: welcome
  welcomeParent: {
    en: {
      subject:  'Welcome to kidvo! 🎉',
      heading:  'Welcome to kidvo!',
      body:     'Hi {name}, great to have you here!',
      body2:    'kidvo helps Timișoara families discover and try the best activities for their kids — sports, arts, music, coding, and more.',
      body3:    'Browse activities now and request a trial session with providers — most offer a free first session, no payment required.',
      cta:      'Browse activities →',
    },
    ro: {
      subject:  'Bine ai venit pe kidvo! 🎉',
      heading:  'Bine ai venit pe kidvo!',
      body:     'Bună {name}, ne bucurăm că ești aici!',
      body2:    'kidvo ajută familiile din Timișoara să descopere și să încerce cele mai bune activități pentru copii — sport, arte, muzică, programare și multe altele.',
      body3:    'Explorează activitățile acum și cere o ședință de probă — majoritatea furnizorilor oferă prima ședință gratuită.',
      cta:      'Explorează activitățile →',
    },
  },

  // #7 — Provider: welcome
  welcomeProvider: {
    en: {
      subject:     'Welcome to kidvo — start listing!',
      heading:     'Welcome to kidvo!',
      body:        'Hi {name}, you\'re all set to start listing your activities on kidvo.',
      body2:       'List your first activity and start receiving trial requests from interested parents. It only takes a few minutes.',
      cta:         'List your first activity →',
      disclaimer:  'Your listing will be reviewed by our team within 24 hours before going live.',
    },
    ro: {
      subject:     'Bine ai venit pe kidvo — începe să publici!',
      heading:     'Bine ai venit pe kidvo!',
      body:        'Bună {name}, ești pregătit să-ți publici activitățile pe kidvo.',
      body2:       'Publică prima ta activitate și începe să primești cereri de probă de la părinți interesați. Durează doar câteva minute.',
      cta:         'Publică prima activitate →',
      disclaimer:  'Activitatea ta va fi verificată de echipa noastră în 24 de ore înainte de publicare.',
    },
  },

  // #8 — Provider: listing approved
  listingApproved: {
    en: {
      subject:  'Your listing is live — {listing}',
      heading:  'Your listing is live! 🎉',
      body:     'Great news, {name}! <strong>{listing}</strong> has been approved and is now visible to parents browsing kidvo.',
      body2:    'Parents can now find your activity, save it, and request a trial session.',
      cta:      'View your listing →',
    },
    ro: {
      subject:  'Activitatea ta este live — {listing}',
      heading:  'Activitatea ta este live! 🎉',
      body:     'Vești bune, {name}! <strong>{listing}</strong> a fost aprobată și este acum vizibilă pentru părinții care navighează pe kidvo.',
      body2:    'Părinții pot acum să găsească activitatea ta, să o salveze și să ceară o ședință de probă.',
      cta:      'Vezi activitatea ta →',
    },
  },

  // #9 — Provider: listing rejected
  listingRejected: {
    en: {
      subject:     'Listing update — {listing}',
      heading:     'Listing needs changes',
      body:        'Hi {name}, your listing <strong>{listing}</strong> couldn\'t be approved at this time.',
      body2:       'Please review your listing details and make sure all information is complete and accurate. You can edit and resubmit from your dashboard.',
      cta:         'Edit your listing →',
      disclaimer:  'Questions? Reach us at hello@kidvo.eu',
    },
    ro: {
      subject:     'Actualizare activitate — {listing}',
      heading:     'Activitatea necesită modificări',
      body:        'Bună {name}, activitatea ta <strong>{listing}</strong> nu a putut fi aprobată în acest moment.',
      body2:       'Te rugăm să verifici detaliile activității și să te asiguri că toate informațiile sunt complete și corecte. Poți edita și retrimite din dashboard.',
      cta:         'Editează activitatea →',
      disclaimer:  'Întrebări? Scrie-ne la hello@kidvo.eu',
    },
  },

  // #10 — Parent: review approved
  reviewApproved: {
    en: {
      subject:  'Your review is published — {listing}',
      heading:  'Your review is live! 🎉',
      body:     'Hi {name}, your review for <strong>{listing}</strong> has been approved and is now visible to other parents.',
      body2:    'Thank you for helping families in Timișoara find great activities for their kids!',
      cta:      'View the listing →',
    },
    ro: {
      subject:  'Recenzia ta a fost publicată — {listing}',
      heading:  'Recenzia ta este live! 🎉',
      body:     'Bună {name}, recenzia ta pentru <strong>{listing}</strong> a fost aprobată și este acum vizibilă pentru alți părinți.',
      body2:    'Mulțumim că ajuți familiile din Timișoara să găsească activități excelente pentru copiii lor!',
      cta:      'Vezi activitatea →',
    },
  },

  // #11 — Parent: review rejected
  reviewRejected: {
    en: {
      subject:     'Review update — {listing}',
      heading:     'Review not approved',
      body:        'Hi {name}, unfortunately your review for <strong>{listing}</strong> couldn\'t be approved for publication.',
      body2:       'If you have any questions, feel free to reach out to us.',
      cta:         'Browse activities →',
      disclaimer:  'Questions? Reach us at hello@kidvo.eu',
    },
    ro: {
      subject:     'Actualizare recenzie — {listing}',
      heading:     'Recenzie neaprobată',
      body:        'Bună {name}, din păcate recenzia ta pentru <strong>{listing}</strong> nu a putut fi aprobată pentru publicare.',
      body2:       'Dacă ai întrebări, nu ezita să ne contactezi.',
      cta:         'Explorează activitățile →',
      disclaimer:  'Întrebări? Scrie-ne la hello@kidvo.eu',
    },
  },

  // #12 — Provider: review published on their listing
  reviewPublished: {
    en: {
      subject:  'New review on your listing — {listing}',
      heading:  'A new review is live on your listing! 🎉',
      body:     'Hi {name}, a parent left a review for <strong>{listing}</strong> that has been approved and is now public.',
      cta:      'View your listing →',
    },
    ro: {
      subject:  'Recenzie nouă pe activitatea ta — {listing}',
      heading:  'O recenzie nouă este live pe activitatea ta! 🎉',
      body:     'Bună {name}, un părinte a lăsat o recenzie pentru <strong>{listing}</strong> care a fost aprobată și este acum publică.',
      cta:      'Vezi activitatea ta →',
    },
  },

  // #13 — User: account deleted
  accountDeleted: {
    en: {
      subject:     'Your kidvo account has been deleted',
      heading:     'Account deleted',
      body:        'Hi {name}, your kidvo account and all associated data have been permanently deleted.',
      body2:       'We\'re sorry to see you go. If you ever want to return, you\'re always welcome to create a new account.',
      disclaimer:  'If this was a mistake or you have questions, reach us at hello@kidvo.eu',
    },
    ro: {
      subject:     'Contul tău kidvo a fost șters',
      heading:     'Cont șters',
      body:        'Bună {name}, contul tău kidvo și toate datele asociate au fost șterse permanent.',
      body2:       'Ne pare rău că pleci. Dacă vrei să te întorci, ești mereu binevenit să creezi un cont nou.',
      disclaimer:  'Dacă a fost o greșeală sau ai întrebări, scrie-ne la hello@kidvo.eu',
    },
  },

  // #14 — User: password reset
  passwordReset: {
    en: {
      subject:  'Reset your kidvo password',
      heading:  'Reset your password',
      body:     'Hi {name}, click the button below to set a new password for your kidvo account.',
      cta:      'Reset password →',
      body2:    'This link expires in 1 hour. If you didn\'t request a password reset, you can safely ignore this email.',
    },
    ro: {
      subject:  'Resetează-ți parola kidvo',
      heading:  'Resetează-ți parola',
      body:     'Bună {name}, apasă butonul de mai jos pentru a seta o parolă nouă pentru contul tău kidvo.',
      cta:      'Resetează parola →',
      body2:    'Acest link expiră în 1 oră. Dacă nu ai cerut resetarea parolei, poți ignora acest email.',
    },
  },

  // #15 — Parent: new listings digest
  digest: {
    en: {
      subjectOne:   '1 new activity from providers you\'ve saved',
      subjectMany:  '{count} new activities from providers you\'ve saved',
      heading:      'New activities from providers you follow',
      body:         'Hi {name}, here\'s what\'s new from providers you\'ve saved:',
      cta:          'Browse all activities →',
      disclaimer:   'You\'re receiving this because you saved activities from these providers on kidvo.',
    },
    ro: {
      subjectOne:   '1 activitate nouă de la furnizori salvați',
      subjectMany:  '{count} activități noi de la furnizori salvați',
      heading:      'Activități noi de la furnizori pe care îi urmărești',
      body:         'Bună {name}, iată ce este nou de la furnizorii salvați:',
      cta:          'Explorează toate activitățile →',
      disclaimer:   'Primești acest email deoarece ai salvat activități de la acești furnizori pe kidvo.',
    },
  },

  // #16 — Provider: trial cancelled by parent
  trialCancelledByParent: {
    en: {
      subject:  'Trial request cancelled — {listing}',
      heading:  'Trial request cancelled',
      body:     'Hi {name},',
      body2:    'A parent has cancelled their trial request for <strong>{listing}</strong>.',
      cta:      'View activities →',
    },
    ro: {
      subject:  'Cerere de probă anulată — {listing}',
      heading:  'Cerere de probă anulată',
      body:     'Bună {name},',
      body2:    'Un părinte a anulat cererea de probă pentru activitatea <strong>{listing}</strong>.',
      cta:      'Vezi activitățile →',
    },
  },

  // #17 — Parent: provider deleted, trial cancelled
  trialCancelledProviderDeleted: {
    en: {
      subject:  'Trial request update — {listing}',
      heading:  'Your trial request has been cancelled',
      body:     'Hi {name},',
      body2:    'We\'re sorry to let you know that the provider of <strong>{listing}</strong> has closed their account, so your trial request has been automatically cancelled.',
      body3:    'There are plenty of other great activities in Timișoara — find the right fit for your child.',
      cta:      'Browse activities →',
    },
    ro: {
      subject:  'Actualizare cerere de probă — {listing}',
      heading:  'Cererea ta de probă a fost anulată',
      body:     'Bună {name},',
      body2:    'Ne pare rău să-ți comunicăm că furnizorul activității <strong>{listing}</strong> și-a închis contul, astfel cererea ta de probă a fost anulată automat.',
      body3:    'Există o mulțime de alte activități minunate în Timișoara — găsește ce se potrivește copilului tău.',
      cta:      'Explorează activitățile →',
    },
  },
} as const

export type EmailKey = keyof typeof translations

export function emailT<K extends EmailKey>(key: K, locale: Locale): (typeof translations)[K]['en'] {
  return translations[key][locale] as (typeof translations)[K]['en']
}
