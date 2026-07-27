import {getSiteOrigin, isIndexableDeployment} from '@/lib/seo'

export default function robots() {
  const origin = getSiteOrigin()

  if (!isIndexableDeployment()) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        disallow: '/api/',
      },
      {
        userAgent: 'GPTBot',
        disallow: '/',
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  }
}
