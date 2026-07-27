const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseStoragePattern = (() => {
  if (!supabaseUrl) return []

  try {
    const url = new URL(supabaseUrl)
    return [
      {
        protocol: url.protocol.replace(':', ''),
        hostname: url.hostname,
        pathname: '/storage/v1/object/public/**',
      },
    ]
  } catch {
    return []
  }
})()

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: supabaseStoragePattern,
  },
  async headers() {
    const noIndexRoutes = [
      '/admin/:path*',
      '/api/:path*',
      '/auth/:path*',
      '/dashboard/:path*',
      '/enoteca/:path*',
      '/game/:path*',
      '/landingpage',
      '/live/:path*',
      '/miei-giochi',
      '/profilo/:path*',
      '/table-live/:path*',
    ]

    return noIndexRoutes.map((source) => ({
      source,
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow',
        },
      ],
    }))
  },
}

export default nextConfig
