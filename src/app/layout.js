import {Nunito} from 'next/font/google'
import './globals.scss'
import LanguageProvider from '@/components/i18n/LanguageProvider'
import PwaRegistrar from '@/components/PwaRegistrar'
import ScrollToTop from '@/components/ScrollToTop'
import AppleSplashLinks from '@/components/AppleSplashLinks'
import AppShell from '@/components/AppShell'
import BottomNav from '@/components/BottomNav'
import {getServerLanguage} from '@/lib/i18n/server'
import {
  getSiteOrigin,
  getSiteSocialImage,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_OG_IMAGE,
} from '@/lib/seo'

const isPreview = process.env.VERCEL_ENV === 'preview'
const iconBase = isPreview ? '/app_icon_feature' : '/app_icon'
const appSafeTopColor = '#000000'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: `${SITE_NAME} | Degustazioni alla cieca`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: 'wine tasting',
  creator: SITE_NAME,
  publisher: SITE_NAME,
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    siteName: SITE_NAME,
    title: `${SITE_NAME} | Degustazioni alla cieca`,
    description: SITE_DESCRIPTION,
    images: [getSiteSocialImage()],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} | Degustazioni alla cieca`,
    description: SITE_DESCRIPTION,
    images: [SITE_OG_IMAGE],
  },
  robots: {
    index: !isPreview,
    follow: !isPreview,
    googleBot: {
      index: !isPreview,
      follow: !isPreview,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: SITE_NAME,
  },
  icons: {
    icon: `${iconBase}/favicon.ico`,
    apple: `${iconBase}/apple-touch-icon.png`,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: appSafeTopColor,
}

export default async function RootLayout({children}) {
  const lang = await getServerLanguage()

  return (
    <html lang={lang}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="Indovinando" />
        <AppleSplashLinks />
      </head>
      <body className={nunito.className}>
        <LanguageProvider initialLang={lang}>
          <PwaRegistrar />
          <ScrollToTop />
          <AppShell>{children}</AppShell>
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  )
}
