import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { routing } from './routing'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value

  let locale: 'ro' | 'en' = routing.defaultLocale

  if (routing.locales.includes(cookieLocale as any)) {
    locale = cookieLocale as 'ro' | 'en'
  } else {
    // Respect Accept-Language as hint on first visit
    const headersList = await headers()
    const acceptLang = headersList.get('accept-language') ?? ''
    if (acceptLang.toLowerCase().startsWith('en')) {
      locale = 'en'
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
