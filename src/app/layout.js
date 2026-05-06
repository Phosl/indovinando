import {Nunito} from 'next/font/google'
import './globals.scss'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

export default function RootLayout({children}) {
  return (
    <html lang="en">
      <body className={nunito.className}>{children}</body>
    </html>
  )
}
