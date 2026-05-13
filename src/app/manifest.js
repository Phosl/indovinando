export default function manifest() {
  return {
    name: 'Indovinando',
    short_name: 'Indovinando',
    description: "Quiz sul vino, gioco live, Enoteca e corso vino in un'unica app.",
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f8ff',
    theme_color: '#f4f8ff',
    lang: 'it-IT',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
