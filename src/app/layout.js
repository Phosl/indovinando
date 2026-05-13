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
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Indovinando',
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
