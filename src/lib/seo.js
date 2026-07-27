export const SITE_NAME = 'Indovinando'
export const SITE_FALLBACK_ORIGIN = 'https://indovinando.vercel.app'
export const SITE_DESCRIPTION =
  'Indovinando è la piattaforma per creare e organizzare degustazioni alla cieca, invitare i partecipanti con un QR e raccogliere classifiche e valutazioni reali sui vini.'
export const SITE_OG_IMAGE = '/og/indovinando-share.jpg'
export const SITE_OG_IMAGE_WIDTH = 1200
export const SITE_OG_IMAGE_HEIGHT = 630
export const SITE_OG_IMAGE_TYPE = 'image/jpeg'
export const SITE_OG_IMAGE_ALT =
  'Sommelier e appassionati durante una degustazione alla cieca con Indovinando'

export function isIndexableDeployment() {
  return process.env.VERCEL_ENV !== 'preview'
}

function normalizeOrigin(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\/+$/, '')

  if (!normalized) return ''
  return normalized.startsWith('http') ? normalized : `https://${normalized}`
}

function isLocalOrigin(value) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value)
}

export function getSiteOrigin() {
  const configuredOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_APP_URL)
  if (configuredOrigin && !isLocalOrigin(configuredOrigin)) return configuredOrigin

  const productionOrigin = normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL)
  if (productionOrigin) return productionOrigin

  if (process.env.NODE_ENV !== 'production' && configuredOrigin) return configuredOrigin

  return SITE_FALLBACK_ORIGIN
}

export function getSiteUrl(path = '/') {
  return new URL(path, `${getSiteOrigin()}/`).toString()
}

export function getSiteSocialImage(alt = SITE_OG_IMAGE_ALT) {
  return {
    url: SITE_OG_IMAGE,
    width: SITE_OG_IMAGE_WIDTH,
    height: SITE_OG_IMAGE_HEIGHT,
    type: SITE_OG_IMAGE_TYPE,
    alt,
  }
}

export function buildPageMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = '/',
  lang = 'it',
  noIndex = false,
}) {
  const socialTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Degustazioni alla cieca`
  const locale = lang === 'en' ? 'en_US' : 'it_IT'
  const shouldIndex = isIndexableDeployment() && !noIndex

  return {
    title: path === '/' && title ? {absolute: socialTitle} : title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: 'website',
      locale,
      url: path,
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [getSiteSocialImage()],
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description,
      images: [SITE_OG_IMAGE],
    },
    robots: !shouldIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  }
}

export function buildLandingStructuredData({lang = 'it', faqItems = []} = {}) {
  const isEnglish = lang === 'en'
  const origin = getSiteOrigin()
  const pageUrl = getSiteUrl('/')
  const description = isEnglish
    ? 'Indovinando is a platform for creating and running blind wine tastings, inviting participants by QR code, and collecting leaderboards and real wine ratings.'
    : SITE_DESCRIPTION
  const featureList = isEnglish
    ? [
        'Create guided blind wine tasting quizzes',
        'Invite participants with a QR code',
        'Collect answers and blind wine ratings',
        'Generate live and final leaderboards',
        'Prepare printable tasting sheets',
      ]
    : [
        'Creazione di quiz guidati per degustazioni alla cieca',
        'Invito dei partecipanti tramite QR',
        'Raccolta di risposte e valutazioni alla cieca',
        'Classifiche in tempo reale e finali',
        'Schede di degustazione stampabili',
      ]

  const graph = [
    {
      '@type': 'Organization',
      '@id': `${origin}/#organization`,
      name: SITE_NAME,
      url: pageUrl,
      logo: getSiteUrl('/app_icon/android-chrome-512x512.png'),
      description,
    },
    {
      '@type': 'WebSite',
      '@id': `${origin}/#website`,
      name: SITE_NAME,
      url: pageUrl,
      inLanguage: isEnglish ? 'en' : 'it',
      description,
      publisher: {'@id': `${origin}/#organization`},
    },
    {
      '@type': 'WebApplication',
      '@id': `${origin}/#webapp`,
      name: SITE_NAME,
      url: pageUrl,
      description,
      applicationCategory: 'LifestyleApplication',
      operatingSystem: 'Any',
      browserRequirements: isEnglish
        ? 'A modern web browser on a smartphone, tablet, or computer.'
        : 'Un browser web moderno su smartphone, tablet o computer.',
      isAccessibleForFree: true,
      featureList,
      offers: {
        '@type': 'Offer',
        price: 0,
        priceCurrency: 'EUR',
        description: isEnglish ? 'Free registration and demo.' : 'Registrazione e demo gratuite.',
      },
      publisher: {'@id': `${origin}/#organization`},
    },
  ]

  if (faqItems.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${origin}/#faq`,
      mainEntity: faqItems.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function buildBreadcrumbStructuredData(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getSiteUrl(item.path),
    })),
  }
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
