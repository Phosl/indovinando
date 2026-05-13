import {Nunito} from 'next/font/google'
import './globals.scss'
import LanguageProvider from '@/components/i18n/LanguageProvider'
import PwaRegistrar from '@/components/PwaRegistrar'
import ScrollToTop from '@/components/ScrollToTop'
import {getServerLanguage} from '@/lib/i18n/server'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  applicationName: 'Indovinando',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Indovinando',
    startupImage: [
      {
        url: '/splash/splash_screens/iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png',
        media:
          'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/splash_screens/iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png',
        media:
          'screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)',
      },
    ],
  },
  icons: {
    icon: '/app_icon/favicon.ico',
    apple: '/app_icon/apple-touch-icon.png',
  },
}

export const viewport = {
  themeColor: '#ffffff',
}

export default async function RootLayout({children}) {
  const lang = await getServerLanguage()

  return (
    <html lang={lang}>
      <body className={nunito.className}>
        <LanguageProvider initialLang={lang}>
          <PwaRegistrar />
          <ScrollToTop />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
