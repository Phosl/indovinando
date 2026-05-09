import {Nunito} from 'next/font/google'
import './globals.scss'
import LanguageProvider from '@/components/i18n/LanguageProvider'
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
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  )
}
