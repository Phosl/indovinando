export default function manifest() {
  const isPreview = process.env.VERCEL_ENV === 'preview'
  const iconBase = isPreview ? '/app_icon_feature' : '/app_icon'
  const themeColor = '#fcf9ef'

  return {
    name: 'Indovinando',
    short_name: 'Indovinando',
    description: "Quiz sul vino, gioco live, Enoteca e corso vino in un'unica app.",
    start_url: '/',
    display: 'standalone',
    background_color: themeColor,
    theme_color: themeColor,
    lang: 'it-IT',
    icons: [
      {
        src: `${iconBase}/android-chrome-192x192.png`,
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: `${iconBase}/android-chrome-512x512.png`,
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
