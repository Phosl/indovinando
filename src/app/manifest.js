export default function manifest() {
  return {
    name: 'Indovinando',
    short_name: 'Indovinando',
    description: "Quiz sul vino, gioco live, Enoteca e corso vino in un'unica app.",
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    lang: 'it-IT',
    icons: [
      {
        src: '/app_icon/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/app_icon/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
