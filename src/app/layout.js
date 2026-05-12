import {Nunito} from 'next/font/google'
import './globals.scss'
import LanguageProvider from '@/components/i18n/LanguageProvider'
import ScrollToTop from '@/components/ScrollToTop'
import {getServerLanguage} from '@/lib/i18n/server'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export default async function RootLayout({children}) {
  const lang = await getServerLanguage()

  return (
    <html lang={lang}>
      <body className={nunito.className}>
        <LanguageProvider initialLang={lang}>
          <ScrollToTop />
          {children}
        </LanguageProvider>
      </body>
    </html>
  )
}
